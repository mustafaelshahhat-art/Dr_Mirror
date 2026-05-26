using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Features.Auth.PhoneVerification;

public static class VerifyOtpEndpoint
{
    private const int MaxOtpAttempts = 5;

    internal static async Task<IResult> HandleAsync(
        VerifyOtpRequest request,
        ICurrentUser current,
        AppDbContext db,
        UserManager<User> userManager,
        ILogger<VerifyOtpRequest> logger,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Code) || request.Code.Length != 6)
        {
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.OtpInvalid },
                statusCode: StatusCodes.Status400BadRequest);
        }

        var otp = await db.PhoneVerificationOtps
            .FirstOrDefaultAsync(o => o.Id == request.SessionId && o.UserId == userId, ct);

        if (otp is null)
        {
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.OtpNotFound },
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (otp.UsedAt is not null)
        {
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.OtpInvalid },
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (otp.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.OtpExpired },
                statusCode: StatusCodes.Status400BadRequest);
        }

        otp.AttemptCount++;

        if (otp.AttemptCount > MaxOtpAttempts)
        {
            await db.SaveChangesAsync(ct);
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.OtpTooManyAttempts },
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (!string.Equals(otp.Code, request.Code.Trim(), StringComparison.Ordinal))
        {
            await db.SaveChangesAsync(ct);
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.OtpInvalid },
                statusCode: StatusCodes.Status400BadRequest);
        }

        // Mark OTP as used
        otp.UsedAt = DateTimeOffset.UtcNow;

        // Confirm the user's phone
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null || user.IsDisabled) return Results.Unauthorized();

        user.PhoneNumber = otp.Phone;
        user.PhoneNumberConfirmed = true;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            logger.LogError("PhoneVerification: UserManager.UpdateAsync failed for userId={UserId}", userId);
            return Results.Problem(
                title: "Verification failed",
                detail: "Could not confirm phone number. Please try again.",
                statusCode: StatusCodes.Status500InternalServerError);
        }

        var roles = await userManager.GetRolesAsync(user);
        logger.LogInformation("PhoneVerification: phone confirmed for userId={UserId}", userId);
        return Results.Ok(new VerifyOtpResponse(true));
    }
}
