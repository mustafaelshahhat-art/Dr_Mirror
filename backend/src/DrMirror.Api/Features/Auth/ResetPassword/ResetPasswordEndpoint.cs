using System.Security.Cryptography;
using System.Text;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Auth.ResetPassword;

public sealed record ResetPasswordRequest(
    string UserId,
    string Token,
    string NewPassword,
    string ConfirmPassword);

public sealed class ResetPasswordValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128);
        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.NewPassword)
            .WithMessage("Passwords do not match.");
    }
}

public static class ResetPasswordEndpoint
{
    public static RouteGroupBuilder MapResetPassword(this RouteGroupBuilder group)
    {
        group.MapPost("/reset-password", HandleAsync)
            .WithName("ResetPassword")
            .WithSummary("Reset password using the token from the forgot-password email.")
            .WithValidation<ResetPasswordRequest>()
            .Produces(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status400BadRequest);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ResetPasswordRequest request,
        UserManager<User> userManager,
        AppDbContext db,
        ILogger<ResetPasswordRequest> logger,
        CancellationToken ct)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
        {
            return Results.Problem(
                title: "Invalid link",
                detail: "The password reset link is invalid.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var tokenHash = Sha256Hex(request.Token);

        var resetRequest = await db.PasswordResetRequests
            .FirstOrDefaultAsync(pr =>
                pr.UserId == userId &&
                pr.TokenHash == tokenHash &&
                !pr.IsUsed &&
                !pr.IsSuperSeded, ct);

        if (resetRequest is null || resetRequest.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return Results.Problem(
                title: "Invalid or expired link",
                detail: "This password reset link is invalid or has expired. Please request a new one.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Results.Problem(
                title: "Invalid link",
                detail: "The password reset link is invalid.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(
                errors: result.Errors
                    .GroupBy(e => MapIdentityErrorToField(e.Code))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()),
                title: "Password reset failed");
        }

        resetRequest.IsUsed = true;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Password reset completed for UserId={UserId}", userId);

        return Results.Ok();
    }

    private static string Sha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string MapIdentityErrorToField(string code) => code switch
    {
        "PasswordTooShort" or "PasswordRequiresDigit" or "PasswordRequiresLower"
            or "PasswordRequiresUpper" or "PasswordRequiresNonAlphanumeric"
            or "PasswordRequiresUniqueChars" => nameof(ResetPasswordRequest.NewPassword),
        "InvalidToken" => nameof(ResetPasswordRequest.Token),
        _ => string.Empty,
    };
}
