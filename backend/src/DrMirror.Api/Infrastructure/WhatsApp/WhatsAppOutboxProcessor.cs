using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppOutboxProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WhatsAppOutboxProcessor> _logger;
    private readonly string _workerId = $"{Environment.MachineName}:{Guid.NewGuid():N}";

    public WhatsAppOutboxProcessor(IServiceScopeFactory scopeFactory, ILogger<WhatsAppOutboxProcessor> logger)
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
                _logger.LogError(ex, "WhatsAppOutboxProcessor: unexpected batch error");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), ct);
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<WhatsAppMessageDispatcher>();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<WhatsAppOptions>>().Value;

        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.AddMinutes(-5);
        var maxAttempts = options.MaxAttempts;

        var claimableIds = await db.WhatsAppOutboxMessages
            .Where(m => m.Attempts < maxAttempts
                && ((m.Status == WhatsAppOutboxStatus.Pending && m.NextRetryAt <= now)
                    || (m.Status == WhatsAppOutboxStatus.Processing && m.LockedAt <= staleBefore)))
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.Id)
            .Take(20)
            .ToListAsync(ct);

        if (claimableIds.Count == 0) return;

        var claimQuery = db.WhatsAppOutboxMessages
            .Where(m => claimableIds.Contains(m.Id)
                && m.Attempts < maxAttempts
                && ((m.Status == WhatsAppOutboxStatus.Pending && m.NextRetryAt <= now)
                    || (m.Status == WhatsAppOutboxStatus.Processing && m.LockedAt <= staleBefore)));

        if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        {
            var inMemoryClaimed = await claimQuery.ToListAsync(ct);
            foreach (var msg in inMemoryClaimed)
            {
                Claim(msg, now);
            }

            await db.SaveChangesAsync(ct);
        }
        else
        {
            await claimQuery.ExecuteUpdateAsync(setters => setters
                .SetProperty(m => m.Status, WhatsAppOutboxStatus.Processing)
                .SetProperty(m => m.LockedAt, now)
                .SetProperty(m => m.LockedBy, _workerId)
                .SetProperty(m => m.Attempts, m => m.Attempts + 1)
                .SetProperty(m => m.LastAttemptAt, now)
                .SetProperty(m => m.FailureReason, (string?)null), ct);
        }

        var claimed = await db.WhatsAppOutboxMessages
            .Where(m => claimableIds.Contains(m.Id)
                && m.Status == WhatsAppOutboxStatus.Processing
                && m.LockedBy == _workerId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        foreach (var msg in claimed)
        {
            try
            {
                await dispatcher.DispatchAsync(msg, ct);
            }
            catch (Exception ex)
            {
                msg.FailureReason = "sidecar_error";
                msg.LockedAt = null;
                msg.LockedBy = null;

                if (msg.Attempts >= maxAttempts)
                {
                    msg.Status = WhatsAppOutboxStatus.Failed;
                    _logger.LogError(ex, "WhatsAppOutbox: permanently failed {EventType} (id={Id})", msg.EventType, msg.Id);
                }
                else
                {
                    msg.Status = WhatsAppOutboxStatus.Pending;
                    var rawSeconds = Math.Min(Math.Pow(4, msg.Attempts) * 30, options.MaxBackoff.TotalSeconds);
                    msg.NextRetryAt = DateTimeOffset.UtcNow.Add(TimeSpan.FromSeconds(rawSeconds));
                    _logger.LogWarning(ex, "WhatsAppOutbox: retry scheduled for {EventType} (id={Id})", msg.EventType, msg.Id);
                }
            }

            await ReconcileRetryParentAsync(db, msg, ct);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogWarning(ex, "WhatsAppOutbox: concurrency conflict ignored for {Id}", msg.Id);
            }
        }
    }

    private void Claim(WhatsAppOutboxMessage msg, DateTimeOffset now)
    {
        msg.Status = WhatsAppOutboxStatus.Processing;
        msg.LockedAt = now;
        msg.LockedBy = _workerId;
        msg.Attempts++;
        msg.LastAttemptAt = now;
        msg.FailureReason = null;
    }

    private static async Task ReconcileRetryParentAsync(AppDbContext db, WhatsAppOutboxMessage child, CancellationToken ct)
    {
        if (child.ParentMessageId is not { } parentId)
        {
            return;
        }

        var parent = await db.WhatsAppOutboxMessages.FirstOrDefaultAsync(m => m.Id == parentId, ct);
        if (parent is null || parent.Status != WhatsAppOutboxStatus.Retrying)
        {
            return;
        }

        if (child.Status == WhatsAppOutboxStatus.Sent)
        {
            parent.Status = WhatsAppOutboxStatus.Sent;
            parent.FailureReason = null;
            return;
        }

        if (child.Status is WhatsAppOutboxStatus.Failed or WhatsAppOutboxStatus.Skipped)
        {
            parent.Status = WhatsAppOutboxStatus.Failed;
            parent.FailureReason = child.FailureReason;
        }
    }
}
