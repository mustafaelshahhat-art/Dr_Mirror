using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
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
            .Produces<PagedResult<OrderSummaryDto>>(StatusCodes.Status200OK);

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

        var query = db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.BuyerUserId == userId);

        var total = await query.CountAsync(ct);
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)ps);
        return Results.Ok(new PagedResult<OrderSummaryDto>(
            orders.Select(o => o.ToSummary()).ToList(), p, ps, total, totalPages));
    }
}
