using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.ListOrders;

public static class ListOrdersEndpoint
{
    public static RouteGroupBuilder MapListOrders(this RouteGroupBuilder group)
    {
        group.MapGet("/", HandleAsync)
            .WithName("Admin.Orders.List")
            .WithSummary("List every order, optionally filtered by status, most recent first.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<IReadOnlyList<OrderSummaryDto>>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext db,
        [FromQuery] OrderStatus? status,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        var p = Math.Max(1, page ?? 1);
        var ps = Math.Clamp(pageSize ?? 25, 1, 100);

        var query = db.Orders.AsNoTracking().Include(o => o.Items).AsQueryable();
        if (status.HasValue) query = query.Where(o => o.Status == status.Value);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        return Results.Ok(orders.Select(o => o.ToSummary()).ToList());
    }
}
