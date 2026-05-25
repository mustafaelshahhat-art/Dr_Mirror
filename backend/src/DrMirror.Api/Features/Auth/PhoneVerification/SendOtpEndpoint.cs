using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared.RateLimiting;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Auth.PhoneVerification;

public static class SendOtpEndpoint
{
    public static RouteGroupBuilder MapPhoneVerificationEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/phone/verify/send", HandleAsync)
            .WithName("Account.SendPhoneVerificationOtp")
            .WithSummary("Send or resend a WhatsApp phone verification OTP.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.OtpSend)
            .Produces<SendOtpResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        group.MapGet("/phone/verify/send-status/{sessionId:guid}", GetSendStatusAsync)
            .WithName("Account.GetPhoneVerificationOtpSendStatus")
            .WithSummary("Check WhatsApp OTP send status for the authenticated customer.")
            .RequireAuthorization()
            .Produces<OtpSendStatusResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/phone/verify", VerifyOtpEndpoint.HandleAsync)
            .WithName("Account.VerifyPhoneOtp")
            .WithSummary("Verify the authenticated customer's phone with a WhatsApp OTP.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.OtpVerify)
            .Produces<VerifyOtpResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        return group;
    }

    internal static async Task<IResult> HandleAsync(
        SendOtpRequest request,
        ICurrentUser current,
        AppDbContext db,
        IPhoneVerificationOtpSendQueue otpSendQueue,
        ILogger<SendOtpRequest> logger,
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

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || user.IsDisabled) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            return Results.Json(new { code = PhoneVerificationErrorCodes.NoPhoneOnFile }, statusCode: StatusCodes.Status400BadRequest);
        }

        return await SendAsync(user, purpose, db, otpSendQueue, logger, ct);
    }

    private static async Task<IResult> GetSendStatusAsync(
        Guid sessionId,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();

        var session = await db.PhoneVerificationOtps
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == sessionId && o.UserId == userId, ct);
        if (session is null) return Results.NotFound();

        var status = PhoneVerificationHelpers.SendStatusValue(session.SendStatus);
        var message = session.SendStatus switch
        {
            PhoneVerificationOtpSendStatus.Sent => "Verification code sent via WhatsApp.",
            PhoneVerificationOtpSendStatus.Failed => "Could not send the WhatsApp code. Please try again.",
            _ => "Sending verification code via WhatsApp...",
        };

        return Results.Ok(new OtpSendStatusResponse(
            status,
            message,
            session.SendStatus == PhoneVerificationOtpSendStatus.Failed && session.ResendCount < PhoneVerificationHelpers.MaxResends));
    }

    internal static async Task<IResult> SendAsync(
        User user,
        OtpPurpose purpose,
        AppDbContext db,
        IPhoneVerificationOtpSendQueue otpSendQueue,
        ILogger logger,
        CancellationToken ct)
    {
        var total = Stopwatch.StartNew();
        var now = DateTimeOffset.UtcNow;
        var phone = user.PhoneNumber!;
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

        var latestSession = await db.PhoneVerificationOtps
            .Where(o => o.UserId == user.Id
                && o.PhoneNumber == phone
                && o.Purpose == purpose
                && !o.IsUsed
                && o.ExpiresAt > now)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (latestSession is not null)
        {
            var cooldownUntil = latestSession.CreatedAt.AddSeconds(PhoneVerificationHelpers.CooldownSeconds);
            if (cooldownUntil > now && latestSession.SendStatus != PhoneVerificationOtpSendStatus.Failed)
            {
                return Results.Json(new
                {
                    code = PhoneVerificationErrorCodes.OtpCooldownActive,
                    retryAfterSeconds = PhoneVerificationHelpers.RetryAfterSeconds(cooldownUntil, now),
                }, statusCode: StatusCodes.Status409Conflict);
            }

            if (latestSession.ResendCount >= PhoneVerificationHelpers.MaxResends)
            {
                latestSession.LockedUntil = now.Add(PhoneVerificationHelpers.LockoutDuration);
                await db.SaveChangesAsync(ct);
                return Results.Json(new
                {
                    code = PhoneVerificationErrorCodes.OtpSessionLocked,
                    retryAfterSeconds = (int)PhoneVerificationHelpers.LockoutDuration.TotalSeconds,
                }, statusCode: StatusCodes.Status429TooManyRequests);
            }
        }

        var code = PhoneVerificationHelpers.GenerateCode();
        var session = new PhoneVerificationOtp
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            PhoneNumber = phone,
            Purpose = purpose,
            ResendCount = latestSession is null ? 0 : latestSession.ResendCount + 1,
            CodeHash = PhoneVerificationHelpers.HashCode(code),
            ExpiresAt = now.Add(PhoneVerificationHelpers.OtpLifetime),
            IsUsed = false,
            WrongAttempts = 0,
            LockedUntil = null,
            SendStatus = PhoneVerificationOtpSendStatus.Sending,
            SendQueuedAt = now,
            CreatedAt = now,
        };
        db.PhoneVerificationOtps.Add(session);

        var saveSw = Stopwatch.StartNew();
        await db.SaveChangesAsync(ct);
        saveSw.Stop();

        var enqueueSw = Stopwatch.StartNew();
        await otpSendQueue.EnqueueAsync(new PhoneVerificationOtpSendJob(
            session.Id,
            user.Id,
            purpose,
            PhoneNormalizer.ToE164(phone),
            maskedPhone,
            PhoneVerificationHelpers.MessageBody(code)), ct);
        enqueueSw.Stop();
        total.Stop();

        logger.LogInformation(
            "Phone OTP session queued for UserId={UserId}, Phone={MaskedPhone}, Purpose={Purpose}, SessionId={SessionId}, SaveMs={SaveMs}, EnqueueMs={EnqueueMs}, TotalMs={TotalMs}",
            user.Id,
            maskedPhone,
            purpose,
            session.Id,
            saveSw.ElapsedMilliseconds,
            enqueueSw.ElapsedMilliseconds,
            total.ElapsedMilliseconds);

        return Results.Ok(new SendOtpResponse(
            session.Id,
            maskedPhone,
            PhoneVerificationHelpers.CooldownSeconds,
            Math.Max(0, PhoneVerificationHelpers.MaxResends - session.ResendCount),
            PhoneVerificationHelpers.SendStatusValue(session.SendStatus)));
    }
}
