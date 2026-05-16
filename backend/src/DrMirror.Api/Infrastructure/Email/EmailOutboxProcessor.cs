using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.Email;

public sealed class EmailOutboxProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailOutboxProcessor> _logger;

    public EmailOutboxProcessor(IServiceScopeFactory scopeFactory, ILogger<EmailOutboxProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "EmailOutboxProcessor: unexpected error during batch");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), ct).ConfigureAwait(false);
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var emailOptions = scope.ServiceProvider.GetRequiredService<IOptions<EmailOptions>>().Value;

        const int maxAttempts = 10;
        var now = DateTimeOffset.UtcNow;

        var pending = await db.EmailOutboxMessages
            .Where(m => m.Status == OutboxMessageStatus.Pending
                     && m.Attempts < maxAttempts
                     && m.NextRetryAt <= now)
            .Take(20)
            .ToListAsync(ct);

        foreach (var msg in pending)
        {
            msg.Attempts++;
            msg.LastAttemptAt = DateTimeOffset.UtcNow;
            try
            {
                await OutboxMessageDispatcher.DispatchAsync(msg, db, email, emailOptions, ct);
                msg.Status = OutboxMessageStatus.Sent;
                msg.DeliveredAt = DateTimeOffset.UtcNow;
                _logger.LogInformation("EmailOutbox: sent {EventType} (id={Id})", msg.EventType, msg.Id);
            }
            catch (Exception ex)
            {
                msg.FailureReason = ex.Message;
                if (msg.Attempts >= maxAttempts)
                {
                    msg.Status = OutboxMessageStatus.Failed;
                    _logger.LogError(ex,
                        "EmailOutbox: permanently failed {EventType} (id={Id}) after {Attempts} attempts",
                        msg.EventType, msg.Id, msg.Attempts);
                }
                else
                {
                    // Exponential backoff: 30s, 2m, 8m, 30m, 2h, …
                    msg.NextRetryAt = DateTimeOffset.UtcNow
                        .AddSeconds(Math.Pow(4, msg.Attempts) * 30);
                    _logger.LogWarning(ex,
                        "EmailOutbox: attempt {Attempts} failed for {EventType} (id={Id}), retry at {NextRetry}",
                        msg.Attempts, msg.EventType, msg.Id, msg.NextRetryAt);
                }
            }
            await db.SaveChangesAsync(ct);
        }
    }

}
