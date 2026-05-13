using Coravel.Queuing.Interfaces;
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

        // ---- Validate every line is still available and in stock. ---------------
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
            if (line.Quantity > v.Stock)
            {
                return Results.Problem(
                    title: "Insufficient stock",
                    detail: $"Only {v.Stock} of \"{p.NameEn}\" ({v.Size} / {v.ColorName}) available — your cart wants {line.Quantity}.",
                    statusCode: StatusCodes.Status409Conflict);
            }
        }

        // ---- Build the order. The DbContext has EnableRetryOnFailure, which is
        //      incompatible with user-initiated transactions; SaveChangesAsync
        //      is already atomic per call. OrderNumberGenerator commits the
        //      counter row first; if the subsequent SaveChanges fails we lose
        //      that single order number (tolerable, sequence may have gaps). --
        var orderNumber = await numberGenerator.NextAsync(ct);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            BuyerUserId = userId,
            Status = OrderStatus.Pending, // bumped immediately by the FSM below
            Currency = "EGP",
            ShippingFee = 0m, // Phase 2a: free shipping. M4 adds the shipping matrix.
            PaymentMethodId = paymentMethod.Id,
            PaymentMethodKind = paymentMethod.Kind,
            PaymentMethodNameEn = paymentMethod.NameEn,
            PaymentMethodNameAr = paymentMethod.NameAr,
            BuyerNote = request.BuyerNote,
            ShippingAddress = new ShippingAddress
            {
                RecipientName = request.ShippingAddress.RecipientName.Trim(),
                Phone = request.ShippingAddress.Phone.Trim(),
                Governorate = request.ShippingAddress.Governorate.Trim(),
                City = request.ShippingAddress.City.Trim(),
                StreetAddress = request.ShippingAddress.StreetAddress.Trim(),
                Floor = request.ShippingAddress.Floor?.Trim(),
                Apartment = request.ShippingAddress.Apartment?.Trim(),
                Landmark = request.ShippingAddress.Landmark?.Trim(),
                Notes = request.ShippingAddress.Notes?.Trim(),
            },
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

            // Decrement stock as part of the same transaction.
            v.Stock -= line.Quantity;
            v.UpdatedAt = DateTimeOffset.UtcNow;
        }

        order.SubTotal = subTotal;
        order.Total = subTotal + order.ShippingFee;

        // COD → straight to Confirmed (no upfront payment to wait for).
        // Online methods stay at Pending until the buyer uploads a payment proof.
        if (paymentMethod.Kind == PaymentMethodKind.Cod)
        {
            fsm.Transition(order, OrderStatus.Confirmed, OrderActor.System);
        }
        // else: leave order.Status = Pending (set on construction above).

        db.Orders.Add(order);

        // Clear the cart — checkout consumes it.
        db.CartItems.RemoveRange(cart.Items);
        cart.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

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
