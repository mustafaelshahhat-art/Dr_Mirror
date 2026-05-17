using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Users;

public static class UpdateUserRolesEndpoint
{
    public static RouteGroupBuilder MapUpdateUserRoles(this RouteGroupBuilder group)
    {
        group.MapPut("/{userId:guid}/roles", HandleAsync)
            .WithName("Admin.Users.UpdateRoles")
            .WithSummary("Replace a user's supported roles. Protects against removing the final admin.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminUserDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        Guid userId,
        UpdateUserRolesRequest request,
        UserManager<User> userManager,
        AppDbContext db,
        CancellationToken ct)
    {
        var requested = request.Roles
            .Select(r => r.Trim())
            .Where(r => r.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var unsupported = requested
            .Where(r => !UserRoles.All.Contains(r, StringComparer.OrdinalIgnoreCase))
            .ToArray();
        if (unsupported.Length > 0)
        {
            return Results.Problem(
                title: "Unsupported role",
                detail: $"Supported roles are: {string.Join(", ", UserRoles.All)}.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var desiredRoles = UserRoles.All
            .Where(role => requested.Contains(role, StringComparer.OrdinalIgnoreCase))
            .ToArray();

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Results.Problem(title: "User not found", statusCode: StatusCodes.Status404NotFound);
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        var removingAdmin = currentRoles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase)
            && !desiredRoles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase);

        if (removingAdmin && await IsLastAdminAsync(db, userId, ct))
        {
            return Results.Problem(
                title: "Cannot remove the last admin",
                detail: "At least one admin account must remain active.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var rolesToRemove = currentRoles
            .Where(role => !desiredRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
            .ToArray();
        var rolesToAdd = desiredRoles
            .Where(role => !currentRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
            .ToArray();

        if (rolesToRemove.Length > 0)
        {
            var removeResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeResult.Succeeded) return IdentityProblem(removeResult);
        }

        if (rolesToAdd.Length > 0)
        {
            var addResult = await userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addResult.Succeeded) return IdentityProblem(addResult);
        }

        var updatedRoles = await userManager.GetRolesAsync(user);
        return Results.Ok(user.ToAdminDto(updatedRoles));
    }

    private static async Task<bool> IsLastAdminAsync(AppDbContext db, Guid userId, CancellationToken ct)
    {
        var adminRoleId = await db.Roles
            .Where(r => r.Name == UserRoles.Admin)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(ct);

        if (adminRoleId == Guid.Empty) return true;

        var otherAdminExists = await db.Set<IdentityUserRole<Guid>>()
            .AnyAsync(ur => ur.RoleId == adminRoleId && ur.UserId != userId, ct);

        return !otherAdminExists;
    }

    private static IResult IdentityProblem(IdentityResult result) => Results.Problem(
        title: "Role update failed",
        detail: string.Join(" ", result.Errors.Select(e => e.Description)),
        statusCode: StatusCodes.Status400BadRequest);
}

public sealed record UpdateUserRolesRequest(string[] Roles);
