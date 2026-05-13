using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.GetMyOrderByNumber;

public static class GetMyOrderByNumberEndpoint
{
    public static RouteGroupBuilder MapGetMyOrderByNumber(this RouteGroupBuilder group)
    {
        group.MapGet("/{orderNumber}", HandleAsync)
            .WithName("Orders.GetMyOrderByNumber")
            .WithSummary("Return one of the buyer's own orders, by its human-friendly order number.")
            .RequireAuthorization()
            .Produces<OrderDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        ICurrentUser current,
        AppDbContext db,
        [FromServices] OrderStateMachine fsm,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .Include(o => o.PaymentMethod)
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

        return Results.Ok(order.ToDetail(fsm));
    }
}
