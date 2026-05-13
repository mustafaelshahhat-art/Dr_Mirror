using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.GetMyOrders;

public static class GetMyOrdersEndpoint
{
    public static RouteGroupBuilder MapGetMyOrders(this RouteGroupBuilder group)
    {
        group.MapGet("/", HandleAsync)
            .WithName("Orders.GetMyOrders")
            .WithSummary("List the signed-in buyer's orders, most recent first.")
            .RequireAuthorization()
            .Produces<IReadOnlyList<OrderSummaryDto>>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ICurrentUser current,
        AppDbContext db,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var p = Math.Max(1, page ?? 1);
        var ps = Math.Clamp(pageSize ?? 20, 1, 50);

        var orders = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.BuyerUserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        return Results.Ok(orders.Select(o => o.ToSummary()).ToList());
    }
}
