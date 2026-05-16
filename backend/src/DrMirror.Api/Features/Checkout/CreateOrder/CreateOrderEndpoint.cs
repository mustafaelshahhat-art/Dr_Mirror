using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Checkout.CreateOrder;

public static class CreateOrderEndpoint
{
    public static RouteGroupBuilder MapCreateOrder(this RouteGroupBuilder group)
    {
        group.MapPost("/", HandleAsync)
            .WithName("Checkout.CreateOrder")
            .WithSummary("Convert the signed-in buyer's open cart into a new order.")
            .RequireAuthorization()
            .WithValidation<CreateOrderRequest>()
            .Produces<OrderDetailDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        CreateOrderRequest request,
        ICurrentUser current,
        AppDbContext db,
        [FromServices] OrderStateMachine fsm,
        [FromServices] OrderNumberGenerator numberGenerator,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        // ---- Load cart with everything we need to project order items. ----------
        var cart = await db.Carts
            .Include(c => c.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v!.Product)
                        .ThenInclude(p => p!.Category)
            .Include(c => c.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v!.Product)
                        .ThenInclude(p => p!.Images)
            .FirstOrDefaultAsync(c => c.UserId == userId, ct);

        if (cart is null || cart.Items.Count == 0)
        {
            return Results.Problem(
                title: "Cart is empty",
                detail: "Add at least one item before checking out.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        // ---- Validate payment method. -------------------------------------------
        var paymentMethod = await db.PaymentMethods
            .FirstOrDefaultAsync(m => m.Id == request.PaymentMethodId && m.IsActive, ct);
        if (paymentMethod is null)
        {
            return Results.Problem(
                title: "Payment method not available",
                statusCode: StatusCodes.Status400BadRequest);
        }

        // Phase 2b: COD and the two online flows (Instapay/Wallet) are accepted.
        // The initial order status differs — see the FSM call below.

        // ---- Resolve shipping address from saved book or inline payload. -------
        var (shippingAddress, addressError) = await ShippingAddressResolver.ResolveAsync(
            request.BuyerAddressId, request.ShippingAddress, userId, db, ct);
        if (addressError is not null) return addressError;

        // ---- Initial availability check (pre-decrement). Saves a transaction
        //      round-trip in the common no-contention case. The same check is
        //      repeated inside the retry loop with fresh data.
        foreach (var line in cart.Items)
        {
            var v = line.ProductVariant!;
            var p = v.Product!;
            if (!v.IsActive || !p.IsPublished || !p.Category!.IsActive)
            {
                return Results.Problem(
                    title: "Item no longer available",
                    detail: $"\"{p.NameEn}\" ({v.Size} / {v.ColorName}) is no longer available. Please remove it from your cart.",
                    statusCode: StatusCodes.Status409Conflict);
            }
        }

        // ---- Build the order entity (no DB writes yet). ------------------------
        var orderNumber = await numberGenerator.NextAsync(ct);
        var order = OrderFactory.Build(orderNumber, userId, cart.Items, paymentMethod, shippingAddress!, request.BuyerNote, fsm);

        db.Orders.Add(order);
        db.CartItems.RemoveRange(cart.Items);
        cart.UpdatedAt = DateTimeOffset.UtcNow;
        db.EmailOutboxMessages.Add(EmailOutboxHelper.ForOrderConfirmation(order.Id));

        // ---- Optional: save the inline address to the buyer's address book. ----
        if (request.SaveAsNewAddress && request.ShippingAddress is not null)
        {
            var addrCount = await db.BuyerAddresses.CountAsync(a => a.UserId == userId, ct);
            if (addrCount < Features.Addresses.AddressLimits.MaxAddressesPerUser)
            {
                var makeDefault = addrCount == 0;
                if (makeDefault)
                {
                    // First-ever address — also mark it default.
                }
                db.BuyerAddresses.Add(new BuyerAddress
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Label = request.Label!.Trim(),
                    RecipientName = shippingAddress!.RecipientName,
                    Phone = shippingAddress.Phone,
                    Governorate = shippingAddress.Governorate,
                    City = shippingAddress.City,
                    StreetAddress = shippingAddress.StreetAddress,
                    Floor = shippingAddress.Floor,
                    Apartment = shippingAddress.Apartment,
                    Landmark = shippingAddress.Landmark,
                    Notes = shippingAddress.Notes,
                    IsDefault = makeDefault,
                });
            }
            // Over the cap → we silently skip the save-to-book. The order itself
            // still goes through; the buyer can prune the book and resave later.
        }

        // ---- Stock decrement with single retry on RowVersion conflict. ---------
        // The ProductVariant.RowVersion column makes EF throw
        // DbUpdateConcurrencyException when two checkouts race the same row.
        // We refresh the conflicting variants, re-validate, and retry once.
        for (var attempt = 1; attempt <= 2; attempt++)
        {
            // Re-validate stock then decrement. On retry, ReloadAsync has reset
            // each variant's Stock to the DB's current value (clearing our
            // earlier in-memory decrement).
            foreach (var line in cart.Items)
            {
                var v = line.ProductVariant!;
                if (line.Quantity > v.Stock)
                {
                    return Results.Problem(
                        title: "Insufficient stock",
                        detail: $"Only {v.Stock} of \"{v.Product!.NameEn}\" ({v.Size} / {v.ColorName}) available — another buyer may have just bought one. Refresh your cart and try again.",
                        statusCode: StatusCodes.Status409Conflict);
                }
                v.Stock -= line.Quantity;
                v.UpdatedAt = DateTimeOffset.UtcNow;
            }

            try
            {
                await db.SaveChangesAsync(ct);
                break; // success
            }
            catch (DbUpdateConcurrencyException ex) when (attempt == 1)
            {
                // Refresh every variant that conflicted so the next pass sees the
                // current Stock + RowVersion. ReloadAsync also reverts our
                // pending decrement to the DB value; the loop body re-applies it.
                foreach (var entry in ex.Entries
                             .Where(e => e.Entity is ProductVariant))
                {
                    await entry.ReloadAsync(ct);
                }
            }
            catch (DbUpdateConcurrencyException)
            {
                // Second attempt also lost the race. Surface a friendly 409
                // rather than a 500. The Order entity has never been committed
                // (it's still Added in the failed transaction) so no DB state
                // needs unwinding.
                return Results.Problem(
                    title: "Couldn't reserve stock",
                    detail: "Another buyer beat you to the last unit. Please refresh your cart and try again.",
                    statusCode: StatusCodes.Status409Conflict);
            }
        }

        // Reload the order with everything the detail DTO needs (slugs on items,
        // buyer summary, payment-method instructions). The freshly-saved entity
        // has the FK set but not all nav properties hydrated.
        var detail = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .Include(o => o.PaymentMethod)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .FirstAsync(o => o.Id == order.Id, ct);

        return Results.Created(
            uri: $"/api/orders/{detail.OrderNumber}",
            value: detail.ToDetail(fsm));
    }
}
