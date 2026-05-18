using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Audit;

public static class AuditQueryEndpoints
{
    public static RouteGroupBuilder MapAuditEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", ListAsync)
            .WithName("Admin.Audit.List")
            .WithSummary("List audit log entries with pagination and filters.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<PagedResult<AdminAuditLogDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:long}", GetByIdAsync)
            .WithName("Admin.Audit.GetById")
            .WithSummary("Get a single audit log entry by ID.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminAuditLogDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> ListAsync(
        AppDbContext db,
        int page = 1,
        int pageSize = 20,
        string? actionType = null,
        string? targetType = null,
        string? targetId = null,
        Guid? actorUserId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.AdminAuditLogEntries
            .AsNoTracking()
            .Include(e => e.ActorUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(actionType))
            query = query.Where(e => e.ActionType == actionType);

        if (!string.IsNullOrWhiteSpace(targetType))
            query = query.Where(e => e.TargetEntityType == targetType);

        if (!string.IsNullOrWhiteSpace(targetId))
            query = query.Where(e => e.TargetEntityId == targetId);

        if (actorUserId.HasValue)
            query = query.Where(e => e.ActorUserId == actorUserId.Value);

        if (from.HasValue)
            query = query.Where(e => e.TimestampUtc >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.TimestampUtc <= to.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(e => e.TimestampUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => e.ToDto())
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return Results.Ok(new PagedResult<AdminAuditLogDto>(items, page, pageSize, total, totalPages));
    }

    private static async Task<IResult> GetByIdAsync(
        long id,
        AppDbContext db,
        CancellationToken ct)
    {
        var entry = await db.AdminAuditLogEntries
            .AsNoTracking()
            .Include(e => e.ActorUser)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

        if (entry is null)
            return Results.Problem(title: "Audit entry not found", statusCode: StatusCodes.Status404NotFound);

        return Results.Ok(entry.ToDto());
    }
}
