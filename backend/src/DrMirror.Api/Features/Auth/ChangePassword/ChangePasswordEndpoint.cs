using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Shared.Auditing;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using DrMirror.Api.Shared.RateLimiting;

namespace DrMirror.Api.Features.Auth.ChangePassword;

public sealed record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword,
    string ConfirmPassword);

public sealed class ChangePasswordValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128);
        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.NewPassword)
            .WithMessage("Passwords do not match.");
    }
}

public static class ChangePasswordEndpoint
{
    public static RouteGroupBuilder MapChangePassword(this RouteGroupBuilder group)
    {
        group.MapPost("/change-password", HandleAsync)
            .WithName("ChangePassword")
            .WithSummary("Change the authenticated user's password.")
            .RequireAuthorization()
            .WithValidation<ChangePasswordRequest>()
            .Produces(StatusCodes.Status204NoContent)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    public static RouteGroupBuilder MapAccountChangePassword(this RouteGroupBuilder group)
    {
        group.MapPost("/password", HandleAsync)
            .WithName("Account.ChangePassword")
            .WithSummary("Change the authenticated user's password.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.PasswordReset)
            .WithValidation<ChangePasswordRequest>()
            .Produces(StatusCodes.Status204NoContent)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ChangePasswordRequest request,
        ICurrentUser current,
        UserManager<User> userManager,
        IAdminAuditWriter audit,
        ILogger<ChangePasswordRequest> logger,
        CancellationToken ct)
    {
        if (current.UserId is not Guid userId)
        {
            return Results.Problem(
                title: "Invalid token",
                detail: "The access token does not identify a known user.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Results.Problem(
                title: "Account not found",
                detail: "Your account could not be located. Please sign in again.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var isMismatch = result.Errors.Any(e => e.Code == "PasswordMismatch");
            if (isMismatch)
            {
                return Results.Json(new { code = "IncorrectCurrentPassword" }, statusCode: StatusCodes.Status400BadRequest);
            }

            return Results.ValidationProblem(
                errors: result.Errors
                    .GroupBy(e => MapIdentityErrorToField(e.Code))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()),
                title: "Password change failed");
        }

        logger.LogInformation("Password changed for UserId={UserId}", userId);

        if (current.Roles.Contains(UserRoles.Admin))
        {
            await audit.WriteAsync("Auth.PasswordChange", "User", userId.ToString(), null, null, ct);
        }

        return Results.NoContent();
    }

    private static string MapIdentityErrorToField(string code) => code switch
    {
        "PasswordMismatch" => nameof(ChangePasswordRequest.CurrentPassword),
        "PasswordTooShort" or "PasswordRequiresDigit" or "PasswordRequiresLower"
            or "PasswordRequiresUpper" or "PasswordRequiresNonAlphanumeric"
            or "PasswordRequiresUniqueChars" => nameof(ChangePasswordRequest.NewPassword),
        _ => string.Empty,
    };
}
