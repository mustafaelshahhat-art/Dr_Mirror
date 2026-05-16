using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Admin.Users;

/// <summary>
/// Replaces the role set of a user. Accepts the full desired roles array;
/// any role not in the array is removed, any new one is added.
/// Admin cannot de-admin themselves — guarded below.
/// </summary>
public static class UpdateUserRolesEndpoint
{
    public static RouteGroupBuilder MapUpdateUserRoles(this RouteGroupBuilder group)
    {
        group.MapPatch("/{userId:guid}/roles", HandleAsync)
            .WithName("Admin.Users.UpdateRoles")
            .WithSummary("Replace a user's role set (admin).")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<UpdateUserRolesRequest>()
            .Produces<AdminUserDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        Guid userId,
        UpdateUserRolesRequest request,
        UserManager<Domain.Entities.User> userManager,
        IHttpContextAccessor httpContext,
        CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return Results.Problem(title: "User not found", statusCode: StatusCodes.Status404NotFound);

        // Safety: an admin cannot strip their own Admin role.
        var callerIdStr = httpContext.HttpContext?.User.FindFirst("sub")?.Value
                       ?? httpContext.HttpContext?.User.FindFirst(
                           System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (callerIdStr is not null
            && Guid.TryParse(callerIdStr, out var callerId)
            && callerId == userId
            && !request.Roles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase))
        {
            return Results.Problem(
                title: "Cannot remove own admin role",
                detail: "An admin cannot de-promote themselves. Ask another admin to do this.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        var desired = request.Roles
            .Select(r => UserRoles.All.First(known =>
                string.Equals(known, r, StringComparison.OrdinalIgnoreCase)))
            .Distinct()
            .ToList();

        var toAdd = desired.Except(currentRoles, StringComparer.OrdinalIgnoreCase).ToList();
        var toRemove = currentRoles.Except(desired, StringComparer.OrdinalIgnoreCase).ToList();

        // Safety: cannot orphan admin access by removing the last admin account.
        if (toRemove.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase))
        {
            var admins = await userManager.GetUsersInRoleAsync(UserRoles.Admin);
            if (admins.Count == 1 && admins[0].Id == userId)
                return Results.Problem(
                    title: "Cannot remove the last admin",
                    detail: "At least one admin account must remain. " +
                            "Assign the Admin role to another user first.",
                    statusCode: StatusCodes.Status409Conflict);
        }

        if (toRemove.Count > 0)
            await userManager.RemoveFromRolesAsync(user, toRemove);

        if (toAdd.Count > 0)
            await userManager.AddToRolesAsync(user, toAdd);

        var updated = await userManager.GetRolesAsync(user);
        return Results.Ok(user.ToAdminDto(updated));
    }
}
