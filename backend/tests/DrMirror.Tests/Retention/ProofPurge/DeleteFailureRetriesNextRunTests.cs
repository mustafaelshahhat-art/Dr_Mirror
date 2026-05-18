using DrMirror.Api.BackgroundServices;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DrMirror.Tests.Retention.ProofPurge;

[Collection(IntegrationTestCollection.Name)]
public class DeleteFailureRetriesNextRunTests : IClassFixture<DeleteFailureRetriesNextRunTests.Factory>
{
    private readonly Factory _factory;

    public DeleteFailureRetriesNextRunTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Non_missing_delete_failure_keeps_row_claimable_and_logs_warning()
    {
        var fileKey = "payment-proofs/delete-failure.jpg";
        await SeedProofAsync(fileKey);
        _factory.StorageFake.ThrowOnDelete = new InvalidOperationException("disk is locked");
        _factory.Logs.Clear();

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<PaymentProofRetentionPurgeService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var proof = await db.PaymentProofs.SingleAsync(p => p.FileKey == fileKey);
            Assert.Null(proof.FilePurgedAtUtc);

            var cutoff = DateTimeOffset.UtcNow.AddYears(-2);
            var isStillClaimable = await db.PaymentProofs
                .Include(p => p.Order)
                .AnyAsync(p => p.FilePurgedAtUtc == null
                    && p.FileKey == fileKey
                    && p.Order != null
                    && (p.Order.Status == OrderStatus.Delivered || p.Order.Status == OrderStatus.Cancelled)
                    && p.Order.UpdatedAt < cutoff);
            Assert.True(isStillClaimable);
        }

        var log = Assert.Single(_factory.Logs.Entries, e => e.Level == LogLevel.Warning);
        Assert.Contains(log.State, p => p.Key == "FileKey" && Equals(p.Value, fileKey));
        Assert.Contains(log.State, p => p.Key == "Reason" && Equals(p.Value, nameof(InvalidOperationException)));
    }

    [Fact]
    public async Task Missing_file_is_marked_purged()
    {
        var fileKey = "payment-proofs/already-missing.jpg";
        await SeedProofAsync(fileKey);
        _factory.StorageFake.ThrowOnDelete = new FileNotFoundException("already gone", fileKey);

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<PaymentProofRetentionPurgeService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using var assertScope = _factory.Services.CreateScope();
        var db = assertScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var proof = await db.PaymentProofs.SingleAsync();
        Assert.NotNull(proof.FilePurgedAtUtc);
        Assert.Empty(proof.FileKey);
    }

    [Fact]
    public async Task Successful_delete_marks_purged_and_clears_file_reference()
    {
        var fileKey = "payment-proofs/delete-success.jpg";
        await SeedProofAsync(fileKey);
        _factory.StorageFake.ThrowOnDelete = null;

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<PaymentProofRetentionPurgeService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using var assertScope = _factory.Services.CreateScope();
        var db = assertScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var proof = await db.PaymentProofs.SingleAsync();
        Assert.NotNull(proof.FilePurgedAtUtc);
        Assert.Empty(proof.FileKey);
        Assert.Empty(proof.FileUrl);
        Assert.Equal([fileKey], _factory.StorageFake.DeletedKeys);
    }

    private async Task SeedProofAsync(string fileKey)
    {
        _factory.StorageFake.Reset();
        _factory.Logs.Clear();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.PaymentProofs.RemoveRange(db.PaymentProofs);
        db.Orders.RemoveRange(db.Orders);
        await db.SaveChangesAsync();

        var cutoff = DateTimeOffset.UtcNow.AddYears(-3);
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "DM-2023-RETRY-" + Guid.NewGuid().ToString("N")[..6],
            Status = OrderStatus.Delivered,
            BuyerUserId = Guid.NewGuid(),
            Currency = "EGP",
            PaymentMethodKind = PaymentMethodKind.Instapay,
            Total = 200,
            SubTotal = 200,
            ShippingFee = 0,
            UpdatedAt = cutoff,
            CreatedAt = cutoff,
        };
        db.Orders.Add(order);
        db.PaymentProofs.Add(new PaymentProof
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            FileKey = fileKey,
            FileUrl = "https://cdn.example.com/proof.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 2048,
            Status = PaymentProofStatus.Approved,
        });
        await db.SaveChangesAsync();
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        public PurgeFailureStorageFake StorageFake { get; } = new();
        public CapturingLoggerProvider Logs { get; } = new();

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            var hosted = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IHostedService) &&
                d.ImplementationType == typeof(PaymentProofRetentionPurgeService));
            if (hosted is not null)
                services.Remove(hosted);

            services.AddTransient<PaymentProofRetentionPurgeService>();

            foreach (var d in services.Where(s => s.ServiceType == typeof(IFileStorageService)).ToList())
                services.Remove(d);
            services.AddSingleton<IFileStorageService>(StorageFake);

            services.AddLogging(builder => builder.AddProvider(Logs));
            services.AddSingleton<ILogger<PaymentProofRetentionPurgeService>>(_ =>
                Logs.CreateLogger<PaymentProofRetentionPurgeService>());
        }
    }

    public sealed class PurgeFailureStorageFake : IFileStorageService
    {
        public Exception? ThrowOnDelete { get; set; }
        public List<string> DeletedKeys { get; } = [];

        public void Reset()
        {
            ThrowOnDelete = null;
            DeletedKeys.Clear();
        }

        public Task DeleteAsync(string fileKey, CancellationToken ct)
        {
            if (ThrowOnDelete is not null)
                throw ThrowOnDelete;

            DeletedKeys.Add(fileKey);
            return Task.CompletedTask;
        }

        public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream());

        public Task<StoredFile> UploadAsync(Stream content, string folder, string originalFileName, string contentType, CancellationToken ct) =>
            Task.FromResult(new StoredFile("/url", "key", contentType, content.Length));
    }

    public sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public List<LogEntry> Entries { get; } = [];

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(this, categoryName);

        public ILogger<T> CreateLogger<T>() => new CapturingLogger<T>(this, typeof(T).FullName!);

        public void Clear() => Entries.Clear();

        public void Dispose()
        {
        }

        private sealed class CapturingLogger : ILogger
        {
            private readonly CapturingLoggerProvider _provider;
            private readonly string _category;

            public CapturingLogger(CapturingLoggerProvider provider, string category)
            {
                _provider = provider;
                _category = category;
            }

            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                var properties = state as IEnumerable<KeyValuePair<string, object?>> ?? [];
                _provider.Entries.Add(new LogEntry(_category, logLevel, properties.ToList(), exception, formatter(state, exception)));
            }
        }

        private sealed class CapturingLogger<T> : ILogger<T>
        {
            private readonly CapturingLoggerProvider _provider;
            private readonly string _category;

            public CapturingLogger(CapturingLoggerProvider provider, string category)
            {
                _provider = provider;
                _category = category;
            }

            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                var properties = state as IEnumerable<KeyValuePair<string, object?>> ?? [];
                _provider.Entries.Add(new LogEntry(_category, logLevel, properties.ToList(), exception, formatter(state, exception)));
            }
        }
    }

    public sealed record LogEntry(
        string Category,
        LogLevel Level,
        IReadOnlyList<KeyValuePair<string, object?>> State,
        Exception? Exception,
        string Message);
}
