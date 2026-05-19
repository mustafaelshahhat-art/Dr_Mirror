using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Auditing;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Users;

public static class UserStatusEndpoints
{
    public static RouteGroupBuilder MapUserStatus(this RouteGroupBuilder group)
    {
        group.MapPost("/{userId:guid}/disable", DisableAsync)
            .WithName("Admin.Users.Disable")
            .WithSummary("Disable a user and invalidate their active access tokens.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminUserDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{userId:guid}/enable", EnableAsync)
            .WithName("Admin.Users.Enable")
            .WithSummary("Re-enable a disabled user and rotate their security stamp.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminUserDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> DisableAsync(
        Guid userId,
        UserManager<User> userManager,
        AppDbContext db,
        IAdminAuditWriter audit,
        CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Results.Problem(title: "User not found", statusCode: StatusCodes.Status404NotFound);
        }

        var roles = await userManager.GetRolesAsync(user);
        if (!user.IsDisabled
            && roles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase)
            && await IsLastActiveAdminAsync(db, userId, ct))
        {
            return Results.Problem(
                title: "Cannot disable the last admin",
                detail: "At least one admin account must remain active.",
                statusCode: StatusCodes.Status409Conflict);
        }

        IResult? result = null;
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async ctInner =>
        {
            await using var tx = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync(ctInner)
                : null;

            user.IsDisabled = true;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            var stampResult = await userManager.UpdateSecurityStampAsync(user);
            if (!stampResult.Succeeded)
            {
                result = IdentityProblem(stampResult);
                return;
            }

            await audit.WriteAsync("User.Disable", "User", user.Id.ToString(), "Enabled", "Disabled", ctInner);
            await db.SaveChangesAsync(ctInner);

            if (tx is not null) await tx.CommitAsync(ctInner);
        }, ct);

        if (result is not null) return result;

        roles = await userManager.GetRolesAsync(user);
        return Results.Ok(user.ToAdminDto(roles));
    }

    private static async Task<IResult> EnableAsync(
        Guid userId,
        UserManager<User> userManager,
        AppDbContext db,
        IAdminAuditWriter audit,
        CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Results.Problem(title: "User not found", statusCode: StatusCodes.Status404NotFound);
        }

        IResult? result = null;
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async ctInner =>
        {
            await using var tx = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync(ctInner)
                : null;

            user.IsDisabled = false;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            var stampResult = await userManager.UpdateSecurityStampAsync(user);
            if (!stampResult.Succeeded)
            {
                result = IdentityProblem(stampResult);
                return;
            }

            await audit.WriteAsync("User.Enable", "User", user.Id.ToString(), "Disabled", "Enabled", ctInner);
            await db.SaveChangesAsync(ctInner);

            if (tx is not null) await tx.CommitAsync(ctInner);
        }, ct);

        if (result is not null) return result;

        var roles = await userManager.GetRolesAsync(user);
        return Results.Ok(user.ToAdminDto(roles));
    }

    private static async Task<bool> IsLastActiveAdminAsync(AppDbContext db, Guid userId, CancellationToken ct)
    {
        var adminRoleId = await db.Roles
            .Where(r => r.Name == UserRoles.Admin)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(ct);

        if (adminRoleId == Guid.Empty) return true;

        return !await db.Set<IdentityUserRole<Guid>>()
            .Join(db.Users, ur => ur.UserId, user => user.Id, (ur, user) => new { ur, user })
            .AnyAsync(x => x.ur.RoleId == adminRoleId && x.user.Id != userId && !x.user.IsDisabled, ct);
    }

    private static IResult IdentityProblem(IdentityResult result) => Results.Problem(
        title: "User status update failed",
        detail: string.Join(" ", result.Errors.Select(e => e.Description)),
        statusCode: StatusCodes.Status400BadRequest);
}
