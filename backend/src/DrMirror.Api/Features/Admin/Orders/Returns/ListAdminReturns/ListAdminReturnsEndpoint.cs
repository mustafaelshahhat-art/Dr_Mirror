using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Admin.Orders.Returns.Common;
using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.Returns.ListAdminReturns;

public static class ListAdminReturnsEndpoint
{
    public static RouteGroupBuilder MapListAdminReturns(this RouteGroupBuilder group)
    {
        group.MapGet("/returns", HandleAsync)
            .WithName("Admin.Orders.Returns.List")
            .WithSummary("List return requests for admin review.")
            .Produces<PagedResult<AdminReturnRequestDto>>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string? status,
        int? page,
        int? pageSize,
        AppDbContext db,
        CancellationToken ct)
    {
        var p = Math.Max(1, page ?? 1);
        var ps = Math.Clamp(pageSize ?? 20, 1, 100);

        var query = db.ReturnRequests
            .AsNoTracking()
            .Include(r => r.Order)
            .Include(r => r.BuyerUser)
            .Include(r => r.ReviewedByAdmin)
            .Include(r => r.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ReturnStatus>(status, ignoreCase: true, out var parsed))
            {
                return Results.Problem(title: "Invalid return status", statusCode: StatusCodes.Status400BadRequest);
            }

            query = query.Where(r => r.Status == parsed);
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(r => r.Status)
            .ThenByDescending(r => r.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)ps);
        return Results.Ok(new PagedResult<AdminReturnRequestDto>(
            rows.Select(r => r.ToAdminDto()).ToList(), p, ps, total, totalPages));
    }
}
