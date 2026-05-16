using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.Email;

public sealed class EmailOutboxProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailOutboxProcessor> _logger;
    private readonly string _workerId = $"{Environment.MachineName}:{Guid.NewGuid():N}";

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
        var staleBefore = now.AddMinutes(-5);

        var claimableIds = await db.EmailOutboxMessages
            .Where(m => m.Attempts < maxAttempts
                     && ((m.Status == OutboxMessageStatus.Pending && m.NextRetryAt <= now)
                         || (m.Status == OutboxMessageStatus.Processing && m.LockedAt <= staleBefore)))
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.Id)
            .Take(20)
            .ToListAsync(ct);

        if (claimableIds.Count == 0) return;

        await db.EmailOutboxMessages
            .Where(m => claimableIds.Contains(m.Id)
                     && m.Attempts < maxAttempts
                     && ((m.Status == OutboxMessageStatus.Pending && m.NextRetryAt <= now)
                         || (m.Status == OutboxMessageStatus.Processing && m.LockedAt <= staleBefore)))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(m => m.Status, OutboxMessageStatus.Processing)
                .SetProperty(m => m.LockedAt, now)
                .SetProperty(m => m.LockedBy, _workerId)
                .SetProperty(m => m.Attempts, m => m.Attempts + 1)
                .SetProperty(m => m.LastAttemptAt, now)
                .SetProperty(m => m.FailureReason, (string?)null), ct);

        var claimed = await db.EmailOutboxMessages
            .Where(m => claimableIds.Contains(m.Id)
                     && m.Status == OutboxMessageStatus.Processing
                     && m.LockedBy == _workerId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        foreach (var msg in claimed)
        {
            try
            {
                await OutboxMessageDispatcher.DispatchAsync(msg, db, email, emailOptions, ct);
                msg.Status = OutboxMessageStatus.Sent;
                msg.DeliveredAt = DateTimeOffset.UtcNow;
                msg.LockedAt = null;
                msg.LockedBy = null;
                _logger.LogInformation("EmailOutbox: sent {EventType} (id={Id})", msg.EventType, msg.Id);
            }
            catch (Exception ex)
            {
                msg.FailureReason = ex.Message;
                if (msg.Attempts >= maxAttempts)
                {
                    msg.Status = OutboxMessageStatus.Failed;
                    msg.LockedAt = null;
                    msg.LockedBy = null;
                    _logger.LogError(ex,
                        "EmailOutbox: permanently failed {EventType} (id={Id}) after {Attempts} attempts",
                        msg.EventType, msg.Id, msg.Attempts);
                }
                else
                {
                    msg.Status = OutboxMessageStatus.Pending;
                    msg.LockedAt = null;
                    msg.LockedBy = null;
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
