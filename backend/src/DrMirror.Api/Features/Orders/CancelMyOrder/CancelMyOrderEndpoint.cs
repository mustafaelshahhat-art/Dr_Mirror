using Coravel.Queuing.Interfaces;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.CancelMyOrder;

public static class CancelMyOrderEndpoint
{
    public static RouteGroupBuilder MapCancelMyOrder(this RouteGroupBuilder group)
    {
        group.MapPost("/{orderNumber}/cancel", HandleAsync)
            .WithName("Orders.CancelMyOrder")
            .WithSummary("Buyer-initiated order cancellation (only allowed in the pre-preparing states).")
            .RequireAuthorization()
            .WithValidation<CancelOrderRequest>()
            .Produces<OrderDetailDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        CancelOrderRequest request,
        ICurrentUser current,
        AppDbContext db,
        [FromServices] OrderStateMachine fsm,
        [FromServices] IQueue queue,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var order = await db.Orders
            .Include(o => o.BuyerUser)
            .Include(o => o.PaymentMethod)
            .Include(o => o.Items).ThenInclude(i => i.ProductVariant)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.PaymentProofs).ThenInclude(p => p.ReviewedByUser)
            .FirstOrDefaultAsync(o =>
                o.OrderNumber == orderNumber && o.BuyerUserId == userId, ct);

        if (order is null)
        {
            return Results.Problem(
                title: "Order not found",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (!fsm.CanTransition(order.Status, OrderStatus.Cancelled, OrderActor.Buyer))
        {
            return Results.Problem(
                title: "Order can no longer be cancelled",
                detail: $"Orders in status {order.Status} cannot be cancelled by the buyer. " +
                        "Contact support if you need to cancel.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // Restock the variants + status flip live in one SaveChanges and so are
        // committed atomically. No explicit transaction needed (and indeed the
        // retrying execution strategy disallows user-initiated transactions).
        foreach (var item in order.Items)
        {
            if (item.ProductVariant is { } v)
            {
                v.Stock += item.Quantity;
                v.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        fsm.Transition(order, OrderStatus.Cancelled, OrderActor.Buyer, request.Reason);

        await db.SaveChangesAsync(ct);

        queue.QueueInvocableWithPayload<SendStatusChangedJob, OrderStatusChangedPayload>(
            new OrderStatusChangedPayload(order.Id, order.Status));

        return Results.Ok(order.ToDetail(fsm));
    }
}
