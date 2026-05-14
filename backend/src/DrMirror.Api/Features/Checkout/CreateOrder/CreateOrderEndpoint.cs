using Coravel.Queuing.Interfaces;
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
        [FromServices] IQueue queue,
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
        ShippingAddress shippingAddress;
        if (request.BuyerAddressId is { } addrId)
        {
            var saved = await db.BuyerAddresses
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == addrId && a.UserId == userId, ct);
            if (saved is null)
            {
                return Results.Problem(
                    title: "Saved address not found",
                    detail: "The selected address was not found in your address book.",
                    statusCode: StatusCodes.Status404NotFound);
            }
            shippingAddress = new ShippingAddress
            {
                RecipientName = saved.RecipientName,
                Phone = saved.Phone,
                Governorate = saved.Governorate,
                City = saved.City,
                StreetAddress = saved.StreetAddress,
                Floor = saved.Floor,
                Apartment = saved.Apartment,
                Landmark = saved.Landmark,
                Notes = saved.Notes,
            };
        }
        else
        {
            // Validator guarantees ShippingAddress is non-null in this branch.
            var inline = request.ShippingAddress!;
            shippingAddress = new ShippingAddress
            {
                RecipientName = inline.RecipientName.Trim(),
                Phone = inline.Phone.Trim(),
                Governorate = Governorates.Normalize(inline.Governorate),
                City = inline.City.Trim(),
                StreetAddress = inline.StreetAddress.Trim(),
                Floor = inline.Floor?.Trim(),
                Apartment = inline.Apartment?.Trim(),
                Landmark = inline.Landmark?.Trim(),
                Notes = inline.Notes?.Trim(),
            };
        }

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

        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            BuyerUserId = userId,
            Status = OrderStatus.Pending, // bumped immediately by the FSM below
            Currency = "EGP",
            ShippingFee = 0m, // Free shipping in V1; M4+ may add a matrix.
            PaymentMethodId = paymentMethod.Id,
            PaymentMethodKind = paymentMethod.Kind,
            PaymentMethodNameEn = paymentMethod.NameEn,
            PaymentMethodNameAr = paymentMethod.NameAr,
            BuyerNote = request.BuyerNote,
            ShippingAddress = shippingAddress,
        };

        decimal subTotal = 0m;
        foreach (var line in cart.Items)
        {
            var v = line.ProductVariant!;
            var p = v.Product!;
            var unit = p.Price;
            var lineTotal = unit * line.Quantity;
            subTotal += lineTotal;

            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = p.Id,
                ProductVariantId = v.Id,
                NameAr = p.NameAr,
                NameEn = p.NameEn,
                Sku = v.Sku,
                Size = v.Size,
                ColorName = v.ColorName,
                ColorNameAr = v.ColorNameAr,
                ColorHex = v.ColorHex,
                PrimaryImageUrl = p.Images
                    .OrderBy(im => im.DisplayOrder)
                    .Select(im => im.Url)
                    .FirstOrDefault(),
                UnitPrice = unit,
                Quantity = line.Quantity,
                LineTotal = lineTotal,
            });
        }

        order.SubTotal = subTotal;
        order.Total = subTotal + order.ShippingFee;

        if (paymentMethod.Kind == PaymentMethodKind.Cod)
        {
            fsm.Transition(order, OrderStatus.Confirmed, OrderActor.System);
        }
        // else: order stays at Pending until proof uploaded.

        db.Orders.Add(order);
        db.CartItems.RemoveRange(cart.Items);
        cart.UpdatedAt = DateTimeOffset.UtcNow;

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
                    RecipientName = shippingAddress.RecipientName,
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

        // Fire-and-forget confirmation email. Coravel runs it in its own scope,
        // so the response is not held up by SMTP latency (and dev's log-only
        // sender never blocks).
        queue.QueueInvocableWithPayload<SendOrderConfirmationJob, Guid>(detail.Id);

        return Results.Created(
            uri: $"/api/orders/{detail.OrderNumber}",
            value: detail.ToDetail(fsm));
    }
}
