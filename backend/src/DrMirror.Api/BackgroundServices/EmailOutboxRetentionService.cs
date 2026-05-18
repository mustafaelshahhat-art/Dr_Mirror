using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.BackgroundServices;

public sealed class EmailOutboxRetentionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailOutboxRetentionService> _logger;

    public EmailOutboxRetentionService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<EmailOutboxRetentionService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = _configuration.GetValue<bool?>("Retention:EnableOutboxPurge") ?? true;
        if (!enabled)
        {
            _logger.LogInformation("EmailOutboxRetentionService disabled by configuration.");
            return;
        }

        _logger.LogInformation("EmailOutboxRetentionService started.");
        while (!stoppingToken.IsCancellationRequested)
        {
            await PurgeOnceAsync(stoppingToken);
            var hours = Math.Max(1, _configuration.GetValue("Retention:OutboxPurgeIntervalHours", 24));
            await Task.Delay(TimeSpan.FromHours(hours), stoppingToken);
        }
    }

    public async Task PurgeOnceAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var retentionDays = Math.Max(1, _configuration.GetValue("Retention:OutboxRetentionDays", 90));
        var cutoff = DateTimeOffset.UtcNow.AddDays(-retentionDays);

        var rows = await db.EmailOutboxMessages
            .Where(m => (m.Status == OutboxMessageStatus.Sent && m.DeliveredAt < cutoff)
                || (m.Status == OutboxMessageStatus.Failed
                    && (m.LastAttemptAt == null || m.LastAttemptAt < cutoff)))
            .ToListAsync(cancellationToken);

        if (rows.Count > 0)
        {
            db.EmailOutboxMessages.RemoveRange(rows);
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Purged {Count} old sent/failed email-outbox messages.", rows.Count);
        }
    }
}
