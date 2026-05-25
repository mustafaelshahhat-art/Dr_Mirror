using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppOutboxRetentionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly WhatsAppOptions _options;
    private readonly ILogger<WhatsAppOutboxRetentionService> _logger;

    public WhatsAppOutboxRetentionService(
        IServiceScopeFactory scopeFactory,
        IOptions<WhatsAppOptions> options,
        ILogger<WhatsAppOutboxRetentionService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (_options.EnableRetentionPurge)
            {
                await PurgeAsync(stoppingToken);
            }

            await Task.Delay(TimeSpan.FromDays(1), stoppingToken);
        }
    }

    private async Task PurgeAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cutoff = DateTimeOffset.UtcNow.AddDays(-Math.Max(1, _options.RetentionDays));

        var query = db.WhatsAppOutboxMessages.Where(m =>
            m.CreatedAt < cutoff &&
            (m.Status == WhatsAppOutboxStatus.Sent
                || m.Status == WhatsAppOutboxStatus.Failed
                || m.Status == WhatsAppOutboxStatus.Skipped));

        var deleted = db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory"
            ? await DeleteInMemoryAsync(query, db, ct)
            : await query.ExecuteDeleteAsync(ct);

        if (deleted > 0)
        {
            _logger.LogInformation("WhatsAppOutboxRetention: purged {Count} old records", deleted);
        }
    }

    private static async Task<int> DeleteInMemoryAsync(IQueryable<WhatsAppOutboxMessage> query, AppDbContext db, CancellationToken ct)
    {
        var rows = await query.ToListAsync(ct);
        db.WhatsAppOutboxMessages.RemoveRange(rows);
        await db.SaveChangesAsync(ct);
        return rows.Count;
    }
}
