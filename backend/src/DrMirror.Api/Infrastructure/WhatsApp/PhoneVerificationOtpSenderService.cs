using System.Diagnostics;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class PhoneVerificationOtpSenderService : BackgroundService
{
    private readonly IPhoneVerificationOtpSendQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PhoneVerificationOtpSenderService> _logger;

    public PhoneVerificationOtpSenderService(
        IPhoneVerificationOtpSendQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<PhoneVerificationOtpSenderService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _queue.ReadAllAsync(stoppingToken))
        {
            await SendAsync(job, stoppingToken);
        }
    }

    private async Task SendAsync(PhoneVerificationOtpSendJob job, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IWhatsAppSender>();

        try
        {
            var loadSw = Stopwatch.StartNew();
            var session = await db.PhoneVerificationOtps.FirstOrDefaultAsync(o => o.Id == job.SessionId, ct);
            loadSw.Stop();
            if (session is null || session.IsUsed || session.ExpiresAt <= DateTimeOffset.UtcNow)
            {
                _logger.LogWarning(
                    "Phone OTP send skipped for SessionId={SessionId}, UserId={UserId}, Phone={MaskedPhone}, Purpose={Purpose}",
                    job.SessionId,
                    job.UserId,
                    job.MaskedPhone,
                    job.Purpose);
                return;
            }

            var sendSw = Stopwatch.StartNew();
            await sender.SendAsync(job.PhoneE164, job.Body, WhatsAppMessagePriority.High, ct);
            sendSw.Stop();

            session.SendStatus = PhoneVerificationOtpSendStatus.Sent;
            session.SentAt = DateTimeOffset.UtcNow;
            session.SendFailureReason = null;
            var saveSw = Stopwatch.StartNew();
            await db.SaveChangesAsync(ct);
            saveSw.Stop();

            sw.Stop();
            _logger.LogInformation(
                "Phone OTP WhatsApp send completed for SessionId={SessionId}, UserId={UserId}, Phone={MaskedPhone}, Purpose={Purpose}, LoadMs={LoadMs}, SendMs={SendMs}, SaveMs={SaveMs}, TotalMs={TotalMs}",
                job.SessionId,
                job.UserId,
                job.MaskedPhone,
                job.Purpose,
                loadSw.ElapsedMilliseconds,
                sendSw.ElapsedMilliseconds,
                saveSw.ElapsedMilliseconds,
                sw.ElapsedMilliseconds);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            try
            {
                var session = await db.PhoneVerificationOtps.FirstOrDefaultAsync(o => o.Id == job.SessionId, ct);
                if (session is not null)
                {
                    session.SendStatus = PhoneVerificationOtpSendStatus.Failed;
                    session.SendFailureReason = "whatsapp_unavailable";
                    await db.SaveChangesAsync(ct);
                }
            }
            catch (Exception updateEx) when (updateEx is not OperationCanceledException)
            {
                _logger.LogError(updateEx, "Failed to persist Phone OTP send failure for SessionId={SessionId}", job.SessionId);
            }

            sw.Stop();
            _logger.LogWarning(
                ex,
                "Phone OTP WhatsApp send failed for SessionId={SessionId}, UserId={UserId}, Phone={MaskedPhone}, Purpose={Purpose} after {ElapsedMs}ms",
                job.SessionId,
                job.UserId,
                job.MaskedPhone,
                job.Purpose,
                sw.ElapsedMilliseconds);
        }
    }
}
