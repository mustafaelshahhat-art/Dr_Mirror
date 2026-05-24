using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.Returns.GetAllMyReturns;

public static class GetAllMyReturnsEndpoint
{
    public static RouteGroupBuilder MapGetAllMyReturns(this RouteGroupBuilder group)
    {
        group.MapGet("/returns", HandleAsync)
            .WithName("Orders.Returns.GetAllMine")
            .WithSummary("List all return requests for the authenticated buyer across all orders.")
            .RequireAuthorization()
            .Produces<PagedResult<ReturnRequestDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        int? page,
        int? pageSize,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var p = Math.Max(1, page ?? 1);
        var ps = Math.Clamp(pageSize ?? 10, 1, 50);

        var query = db.ReturnRequests
            .AsNoTracking()
            .Include(r => r.Order)
            .Include(r => r.Items)
            .Where(r => r.BuyerUserId == userId);

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)ps);
        return Results.Ok(new PagedResult<ReturnRequestDto>(
            rows.Select(r => r.ToDto()).ToList(), p, ps, total, totalPages));
    }
}
