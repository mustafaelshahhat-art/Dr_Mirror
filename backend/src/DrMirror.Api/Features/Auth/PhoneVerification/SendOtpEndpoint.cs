using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared.Localization;
using DrMirror.Api.Shared.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Features.Auth.PhoneVerification;

public static class SendOtpEndpoint
{
    public static RouteGroupBuilder MapPhoneVerificationEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/phone/verify/send", HandleAsync)
            .WithName("Account.SendPhoneVerificationOtp")
            .WithSummary("Send a WhatsApp OTP to the authenticated customer's phone.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.OtpSend)
            .Produces<SendOtpResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        group.MapPost("/phone/verify", VerifyOtpEndpoint.HandleAsync)
            .WithName("Account.VerifyPhoneOtp")
            .WithSummary("Verify the authenticated customer's phone with the WhatsApp OTP.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.OtpVerify)
            .Produces<VerifyOtpResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    internal static async Task<IResult> HandleAsync(
        SendOtpRequest request,
        ICurrentUser current,
        AppDbContext db,
        UserManager<User> userManager,
        IWhatsAppSender sender,
        IOptions<WhatsAppOptions> whatsAppOptions,
        HttpContext http,
        ILogger<SendOtpRequest> logger,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();
        if (!PhoneVerificationHelpers.TryParsePurpose(request.Purpose, out var purpose))
        {
            return Results.Problem(
                title: "Invalid purpose",
                detail: "Purpose must be 'profile' or 'checkout'.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || user.IsDisabled) return Results.Unauthorized();

        // If a phone was supplied in the request, save it before sending OTP.
        // This allows users with no phone on file to enter one at checkout.
        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var newPhone = request.Phone.Trim();
            if (newPhone != user.PhoneNumber)
            {
                user.PhoneNumber = newPhone;
                user.PhoneNumberConfirmed = false;
                user.UpdatedAt = DateTimeOffset.UtcNow;
                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    logger.LogWarning("PhoneVerification: failed to save phone for userId={UserId}", userId);
                    return Results.Problem(
                        title: "Could not save phone number",
                        statusCode: StatusCodes.Status400BadRequest);
                }
            }
        }
        else if (string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.NoPhoneOnFile },
                statusCode: StatusCodes.Status400BadRequest);
        }

        // Invalidate any previous non-expired OTPs for this user/purpose
        var stale = await db.PhoneVerificationOtps
            .Where(o => o.UserId == userId && o.Purpose == purpose && o.UsedAt == null && o.ExpiresAt > DateTimeOffset.UtcNow)
            .ToListAsync(ct);
        foreach (var s in stale)
        {
            s.ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(-1);
        }

        var code = GenerateCode();
        var otp = new PhoneVerificationOtp
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Code = code,
            Phone = user.PhoneNumber,
            Purpose = purpose,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.PhoneVerificationOtps.Add(otp);
        await db.SaveChangesAsync(ct);

        var options = whatsAppOptions.Value;
        // Send OTP via WhatsApp directly (not via outbox — OTP must be immediate)
        if (!options.Enabled)
        {
            logger.LogWarning("PhoneVerification: WhatsApp disabled, OTP will not be sent (userId={UserId})", userId);
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.SendFailed, detail = "WhatsApp notifications are not configured." },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        try
        {
            // Single-language OTP, matching the active UI/request locale (never bilingual).
            var language = NotificationLanguage.FromRequest(http);
            var body = WhatsAppMessageTemplates.OtpVerification(language, code, minutes: 10);
            using var sendCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            sendCts.CancelAfter(TimeSpan.FromSeconds(options.TimeoutSeconds + 5));
            await sender.SendAsync(user.PhoneNumber, body, sendCts.Token);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "PhoneVerification: OTP send failed for userId={UserId}", userId);
            return Results.Json(
                new { code = PhoneVerificationErrorCodes.SendFailed },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        logger.LogInformation("PhoneVerification: OTP sent (sessionId={SessionId}, userId={UserId}, purpose={Purpose})", otp.Id, userId, purpose);
        return Results.Ok(new SendOtpResponse(otp.Id, "sent", PhoneVerificationHelpers.MaskPhone(user.PhoneNumber)));
    }

    private static string GenerateCode()
    {
        var value = Random.Shared.Next(100_000, 999_999);
        return value.ToString();
    }
}
