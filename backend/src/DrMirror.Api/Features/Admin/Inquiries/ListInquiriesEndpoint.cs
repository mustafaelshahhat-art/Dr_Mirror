using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Inquiries.Common;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Inquiries;

/// <summary>
/// Paged list of inquiries, optionally filtered by status. Newest first.
/// </summary>
public static class ListInquiriesEndpoint
{
    public static RouteGroupBuilder MapListInquiries(this RouteGroupBuilder group)
    {
        group.MapGet("/", HandleAsync)
            .WithName("Admin.Inquiries.List")
            .WithSummary("List all inquiries (admin).")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<PagedResult<InquiryDto>>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext db,
        InquiryStatus? status,
        int page = 1,
        int pageSize = 25,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Inquiries
            .AsNoTracking()
            .Include(i => i.Product)
            .Include(i => i.ReadByUser)
            .Include(i => i.RespondedByUser)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(i => i.Status == status.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => i.ToDto())
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return Results.Ok(new PagedResult<InquiryDto>(items, page, pageSize, total, totalPages));
    }
}
