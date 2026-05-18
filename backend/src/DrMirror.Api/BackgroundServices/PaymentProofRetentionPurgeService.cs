using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.BackgroundServices;

public sealed class PaymentProofRetentionPurgeService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentProofRetentionPurgeService> _logger;

    public PaymentProofRetentionPurgeService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<PaymentProofRetentionPurgeService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = _configuration.GetValue<bool?>("Retention:EnableProofPurge") ?? true;
        if (!enabled)
        {
            _logger.LogInformation("PaymentProofRetentionPurgeService disabled by configuration.");
            return;
        }

        _logger.LogInformation("PaymentProofRetentionPurgeService started.");
        while (!stoppingToken.IsCancellationRequested)
        {
            await PurgeOnceAsync(stoppingToken);
            var hours = Math.Max(1, _configuration.GetValue("Retention:ProofPurgeIntervalHours", 24));
            await Task.Delay(TimeSpan.FromHours(hours), stoppingToken);
        }
    }

    public async Task PurgeOnceAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
        var cutoff = DateTimeOffset.UtcNow.AddYears(-2);

        var proofs = await db.PaymentProofs
            .Include(p => p.Order)
            .Where(p => p.FilePurgedAtUtc == null
                && p.FileKey != ""
                && p.Order != null
                && (p.Order.Status == OrderStatus.Delivered || p.Order.Status == OrderStatus.Cancelled)
                && p.Order.UpdatedAt < cutoff)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var proof in proofs)
        {
            try
            {
                await storage.DeleteAsync(proof.FileKey, cancellationToken);
                proof.FileKey = string.Empty;
                proof.FileUrl = string.Empty;
                proof.FilePurgedAtUtc = DateTimeOffset.UtcNow;
            }
            catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
            {
                proof.FileKey = string.Empty;
                proof.FileUrl = string.Empty;
                proof.FilePurgedAtUtc = DateTimeOffset.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to delete payment-proof file {FileKey}; leaving row unpurged for retry. Reason: {Reason}",
                    proof.FileKey,
                    ex.GetType().Name);
                continue;
            }
        }

        if (proofs.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Purged {Count} old payment-proof files.", proofs.Count);
        }
    }
}
