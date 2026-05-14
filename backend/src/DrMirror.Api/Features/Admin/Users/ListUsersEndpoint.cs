using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
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
            .Produces<AdminUserDto[]>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext db,
        UserManager<Domain.Entities.User> userManager,
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

        var users = await query
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var result = new List<AdminUserDto>(users.Count);
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            result.Add(user.ToAdminDto(roles));
        }

        return Results.Ok(result.ToArray());
    }
}
