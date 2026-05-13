using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.GetOrderByNumber;

public static class AdminGetOrderByNumberEndpoint
{
    public static RouteGroupBuilder MapAdminGetOrderByNumber(this RouteGroupBuilder group)
    {
        group.MapGet("/{orderNumber}", HandleAsync)
            .WithName("Admin.Orders.GetByNumber")
            .WithSummary("Return any single order with full buyer + variant detail.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<OrderDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        AppDbContext db,
        [FromServices] OrderStateMachine fsm,
        CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .Include(o => o.PaymentMethod)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.PaymentProofs).ThenInclude(p => p.ReviewedByUser)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, ct);

        if (order is null)
        {
            return Results.Problem(
                title: "Order not found",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(order.ToDetail(fsm));
    }
}
