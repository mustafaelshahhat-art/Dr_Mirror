using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Users;

/// <summary>
/// Returns a paged list of all registered users with their roles.
/// Optional <c>q</c> query parameter filters by name or email substring.
/// </summary>
public static class ListUsersEndpoint
{
    public static RouteGroupBuilder MapListUsers(this RouteGroupBuilder group)
    {
        group.MapGet("/", HandleAsync)
            .WithName("Admin.Users.List")
            .WithSummary("List all users with roles (admin).")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<PagedResult<AdminUserDto>>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext db,
        string? q,
        int page = 1,
        int pageSize = 25,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var lower = q.Trim().ToLowerInvariant();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(lower) ||
                (u.Email != null && u.Email.ToLower().Contains(lower)));
        }

        var total = await query.CountAsync(ct);

        var users = await query
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var userIds = users.Select(u => u.Id).ToList();

        var roleMap = await (
            from ur in db.Set<IdentityUserRole<Guid>>()
            join r in db.Set<IdentityRole<Guid>>() on ur.RoleId equals r.Id
            where userIds.Contains(ur.UserId)
            select new { ur.UserId, r.Name }
        ).ToListAsync(ct);

        var rolesById = roleMap
            .GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Name!).ToArray());

        var result = users
            .Select(u => u.ToAdminDto(rolesById.GetValueOrDefault(u.Id) ?? []))
            .ToList();

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return Results.Ok(new PagedResult<AdminUserDto>(result, page, pageSize, total, totalPages));
    }
}
