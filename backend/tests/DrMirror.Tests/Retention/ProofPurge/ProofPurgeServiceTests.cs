using DrMirror.Api.BackgroundServices;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DrMirror.Tests.Retention.ProofPurge;

[Collection(IntegrationTestCollection.Name)]
public class ProofPurgeServiceTests : IClassFixture<ProofPurgeServiceTests.Factory>
{
    private readonly Factory _factory;

    public ProofPurgeServiceTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PurgeOnceAsync_purges_old_terminal_proofs()
    {
        _factory.StorageFake.Reset();
        var cutoff = DateTimeOffset.UtcNow.AddYears(-3);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            SeedOldDeliveredOrder(db, cutoff);
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<PaymentProofRetentionPurgeService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var proof = await db.PaymentProofs.FirstAsync();
            Assert.NotNull(proof.FilePurgedAtUtc);
            Assert.Empty(proof.FileKey);
            Assert.Empty(proof.FileUrl);
        }

        Assert.Equal(1, _factory.StorageFake.DeleteCallCount);
    }

    [Fact]
    public async Task PurgeOnceAsync_is_idempotent()
    {
        _factory.StorageFake.Reset();
        var cutoff = DateTimeOffset.UtcNow.AddYears(-3);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            SeedOldDeliveredOrder(db, cutoff);
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<PaymentProofRetentionPurgeService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        var callCountAfterFirst = _factory.StorageFake.DeleteCallCount;

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<PaymentProofRetentionPurgeService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        Assert.Equal(callCountAfterFirst, _factory.StorageFake.DeleteCallCount);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var proof = await db.PaymentProofs.FirstAsync();
            Assert.NotNull(proof.FilePurgedAtUtc);
            Assert.Empty(proof.FileKey);
        }
    }

    private static void SeedOldDeliveredOrder(AppDbContext db, DateTimeOffset cutoff)
    {
        var userId = Guid.NewGuid();
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "DM-2023-PURGE-" + Guid.NewGuid().ToString("N")[..6],
            Status = OrderStatus.Delivered,
            BuyerUserId = userId,
            Currency = "EGP",
            PaymentMethodKind = PaymentMethodKind.Instapay,
            Total = 200,
            SubTotal = 200,
            ShippingFee = 0,
            UpdatedAt = cutoff,
            CreatedAt = cutoff,
        };
        var proof = new PaymentProof
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            FileKey = "purge-test-key-" + Guid.NewGuid().ToString("N"),
            FileUrl = "https://cdn.example.com/purge-test.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 2048,
            Status = PaymentProofStatus.Approved,
        };
        db.Orders.Add(order);
        db.PaymentProofs.Add(proof);
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        public PurgeTestStorageFake StorageFake { get; } = new();

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
        }
    }

    public sealed class PurgeTestStorageFake : IFileStorageService
    {
        public int DeleteCallCount { get; set; }

        public void Reset() => DeleteCallCount = 0;

        public Task DeleteAsync(string fileKey, CancellationToken ct)
        {
            DeleteCallCount++;
            return Task.CompletedTask;
        }

        public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream());

        public Task<StoredFile> UploadAsync(Stream content, string folder, string originalFileName, string contentType, CancellationToken ct) =>
            Task.FromResult(new StoredFile("/url", "key", contentType, content.Length));
    }
}
