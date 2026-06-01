using System.Security.Cryptography;
using System.Text;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Localization;
using DrMirror.Api.Shared.RateLimiting;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Features.Auth.ForgotPassword;

public sealed record ForgotPasswordRequest(string Email);

public sealed class ForgotPasswordValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
    }
}

public static class ForgotPasswordEndpoint
{
    public static RouteGroupBuilder MapForgotPassword(this RouteGroupBuilder group)
    {
        group.MapPost("/forgot-password", HandleAsync)
            .WithName("ForgotPassword")
            .WithSummary("Request a password reset link. Always returns 200 to prevent email enumeration.")
            .RequireRateLimiting(RateLimitPolicies.PasswordReset)
            .WithValidation<ForgotPasswordRequest>()
            .Produces(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ForgotPasswordRequest request,
        UserManager<User> userManager,
        AppDbContext db,
        ILogger<ForgotPasswordRequest> logger,
        IOptions<EmailOptions> emailOptions,
        CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null)
            return Results.Ok();

        var userId = user.Id;
        logger.LogInformation("Password reset requested for UserId={UserId}", userId);

        await userManager.UpdateSecurityStampAsync(user);

        var rawToken = await userManager.GeneratePasswordResetTokenAsync(user);
        var tokenHash = Sha256Hex(rawToken);

        var activeRequests = await db.PasswordResetRequests
            .Where(pr => pr.UserId == userId && !pr.IsUsed && !pr.IsSuperSeded)
            .ToListAsync(ct);

        foreach (var ar in activeRequests)
            ar.IsSuperSeded = true;

        var resetRequest = new PasswordResetRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(1),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.PasswordResetRequests.Add(resetRequest);

        var encodedToken = Uri.EscapeDataString(rawToken);
        var resetUrl = emailOptions.Value.FrontendBaseUrl!.TrimEnd('/') +
            $"/reset-password?userId={userId}&token={encodedToken}";
        // Use the customer's stored language so the reset email is deterministic and
        // matches their account preference (the request itself is unauthenticated).
        var language = NotificationLanguage.Normalize(user.Language);

        db.EmailOutboxMessages.Add(EmailOutboxHelper.ForPasswordReset(
            user.Email!, resetUrl, language));

        await db.SaveChangesAsync(ct);

        return Results.Ok();
    }

    private static string Sha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
