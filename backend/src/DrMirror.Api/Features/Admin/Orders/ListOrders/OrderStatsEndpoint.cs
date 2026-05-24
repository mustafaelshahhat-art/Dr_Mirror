using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.ListOrders;

public static class OrderStatsEndpoint
{
    public static RouteGroupBuilder MapOrderStats(this RouteGroupBuilder group)
    {
        group.MapGet("/stats", HandleAsync)
            .WithName("Admin.Orders.Stats")
            .WithSummary("Return order counts grouped by status for the admin hub KPIs.")
            .Produces<OrderStatsResponse>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<OrderStatsResponse> HandleAsync(
        AppDbContext db,
        CancellationToken ct)
    {
        var counts = await db.Orders
            .AsNoTracking()
            .GroupBy(o => o.Status)
            .Select(g => new StatusCount(g.Key, g.Count()))
            .ToListAsync(ct);

        var total = counts.Sum(c => c.Count);

        return new OrderStatsResponse(
            total,
            new Dictionary<string, int>(counts.Select(c =>
                KeyValuePair.Create(c.Status.ToString(), c.Count))));
    }
}

public sealed record StatusCount(OrderStatus Status, int Count);
public sealed record OrderStatsResponse(int TotalOrders, Dictionary<string, int> CountsByStatus);
