using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.TransitionOrder;

public static class TransitionOrderEndpoint
{
    public static RouteGroupBuilder MapTransitionOrder(this RouteGroupBuilder group)
    {
        group.MapPost("/{orderNumber}/transition", HandleAsync)
            .WithName("Admin.Orders.Transition")
            .WithSummary("Move an order to a new status, validated against the OrderStateMachine for the Admin actor.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<TransitionOrderRequest>()
            .Produces<OrderDetailDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        TransitionOrderRequest request,
        AppDbContext db,
        [FromServices] OrderStateMachine fsm,
        CancellationToken ct)
    {
        var order = await db.Orders
            .Include(o => o.BuyerUser)
            .Include(o => o.PaymentMethod)
            .Include(o => o.Items).ThenInclude(i => i.ProductVariant)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.PaymentProofs).ThenInclude(p => p.ReviewedByUser)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, ct);

        if (order is null)
        {
            return Results.Problem(
                title: "Order not found",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (!fsm.CanTransition(order.Status, request.ToStatus, OrderActor.Admin))
        {
            return Results.Problem(
                title: "Invalid status transition",
                detail: $"Cannot move order from {order.Status} to {request.ToStatus} as Admin.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // If admin is cancelling, restock — same rule as buyer-initiated cancel.
        // All mutations land in one SaveChanges and are committed atomically;
        // the retrying execution strategy disallows user-initiated transactions.
        if (request.ToStatus == OrderStatus.Cancelled
            && order.Status != OrderStatus.Cancelled
            && order.Status != OrderStatus.Delivered)
        {
            foreach (var item in order.Items)
            {
                if (item.ProductVariant is { } v)
                {
                    v.Stock += item.Quantity;
                    v.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
        }

        fsm.Transition(order, request.ToStatus, OrderActor.Admin, request.Reason);

        db.EmailOutboxMessages.Add(EmailOutboxHelper.ForStatusChanged(order.Id, order.Status));
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException) when (request.ToStatus == OrderStatus.Cancelled)
        {
            return Results.Problem(
                title: "Couldn't cancel order",
                detail: "Stock changed while the order was being cancelled. Refresh and try again.",
                statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Ok(order.ToDetail(fsm));
    }
}
