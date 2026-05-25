using System.Text.RegularExpressions;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Features.Auth.PhoneVerification;

public static partial class VerifyOtpEndpoint
{
    [GeneratedRegex(@"^\d{6}$")]
    private static partial Regex OtpRegex();

    internal static async Task<IResult> HandleAsync(
        VerifyOtpRequest request,
        ICurrentUser current,
        AppDbContext db,
        IOptions<JwtOptions> jwtOptions,
        ILogger<VerifyOtpRequest> logger,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();
        if (!PhoneVerificationHelpers.TryParsePurpose(request.Purpose, out var purpose))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Purpose)] = ["Purpose must be profile or checkout."],
            });
        }
        if (!OtpRegex().IsMatch(request.Code))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Code)] = ["Code must be exactly 6 digits."],
            });
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || user.IsDisabled) return Results.Unauthorized();
        if (!string.IsNullOrWhiteSpace(user.PhoneNumber) && user.PhoneNumberConfirmed)
        {
            return Results.Ok(new VerifyOtpResponse(true));
        }
        if (string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            return Results.Json(new { code = PhoneVerificationErrorCodes.NoPhoneOnFile }, statusCode: StatusCodes.Status400BadRequest);
        }

        var now = DateTimeOffset.UtcNow;
        var phone = user.PhoneNumber;
        var maskedPhone = PhoneVerificationHelpers.MaskPhone(phone);

        var lockoutUntil = await db.PhoneVerificationOtps
            .Where(o => o.UserId == user.Id && o.PhoneNumber == phone && o.LockedUntil > now)
            .MaxAsync(o => (DateTimeOffset?)o.LockedUntil, ct);
        if (lockoutUntil is { } locked)
        {
            return Results.Json(new
            {
                code = PhoneVerificationErrorCodes.OtpSessionLocked,
                retryAfterSeconds = PhoneVerificationHelpers.RetryAfterSeconds(locked, now),
            }, statusCode: StatusCodes.Status429TooManyRequests);
        }

        var activeSessions = await db.PhoneVerificationOtps
            .Where(o => o.UserId == user.Id
                && o.PhoneNumber == phone
                && o.Purpose == purpose
                && !o.IsUsed
                && o.ExpiresAt > now)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

        if (activeSessions.Count == 0)
        {
            return Results.Json(new { code = PhoneVerificationErrorCodes.OtpExpiredOrUsed }, statusCode: StatusCodes.Status400BadRequest);
        }

        var codeHash = PhoneVerificationHelpers.HashCode(request.Code, jwtOptions.Value.Secret);
        var session = activeSessions.FirstOrDefault(o => string.Equals(o.CodeHash, codeHash, StringComparison.Ordinal));
        if (session is null)
        {
            session = activeSessions[0];
            session.WrongAttempts++;
            var attemptsRemaining = Math.Max(0, PhoneVerificationHelpers.MaxWrongAttempts - session.WrongAttempts);
            if (session.WrongAttempts >= PhoneVerificationHelpers.MaxWrongAttempts)
            {
                session.LockedUntil = now.Add(PhoneVerificationHelpers.LockoutDuration);
                await db.SaveChangesAsync(ct);
                logger.LogWarning("Phone OTP session locked for UserId={UserId}, Phone={MaskedPhone}, Purpose={Purpose}", user.Id, maskedPhone, purpose);
                return Results.Json(new
                {
                    code = PhoneVerificationErrorCodes.OtpSessionLocked,
                    retryAfterSeconds = (int)PhoneVerificationHelpers.LockoutDuration.TotalSeconds,
                }, statusCode: StatusCodes.Status429TooManyRequests);
            }

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Phone OTP verification failed for UserId={UserId}, Phone={MaskedPhone}, Purpose={Purpose}, AttemptsRemaining={AttemptsRemaining}", user.Id, maskedPhone, purpose, attemptsRemaining);
            return Results.Json(new
            {
                code = PhoneVerificationErrorCodes.InvalidOtpCode,
                attemptsRemaining,
            }, statusCode: StatusCodes.Status400BadRequest);
        }

        foreach (var activeSession in activeSessions)
        {
            activeSession.IsUsed = true;
        }

        user.PhoneNumberConfirmed = true;
        user.PhoneVerifiedAt = now;
        user.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Phone verified for UserId={UserId}, Phone={MaskedPhone}, Purpose={Purpose}", user.Id, maskedPhone, purpose);
        return Results.Ok(new VerifyOtpResponse(true));
    }
}
