using DrMirror.Api.BackgroundServices;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DrMirror.Tests.Email;

[Collection(IntegrationTestCollection.Name)]
public class OutboxRetentionTests : IClassFixture<OutboxRetentionTests.Factory>
{
    private readonly Factory _factory;

    public OutboxRetentionTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PurgeOnceAsync_purges_old_sent_messages()
    {
        var rowId = Guid.NewGuid();
        var cutoff = DateTimeOffset.UtcNow.AddDays(-100);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.EmailOutboxMessages.Add(new EmailOutboxMessage
            {
                Id = rowId,
                EventType = "OrderConfirmation",
                Payload = Guid.NewGuid().ToString(),
                IdempotencyKey = "retention-test-key",
                Status = OutboxMessageStatus.Sent,
                DeliveredAt = cutoff,
                CreatedAt = cutoff,
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<EmailOutboxRetentionService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var exists = await db.EmailOutboxMessages.AnyAsync(m => m.Id == rowId);
            Assert.False(exists);
        }
    }

    [Fact]
    public async Task PurgeOnceAsync_keeps_recent_sent_messages()
    {
        var rowId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.EmailOutboxMessages.Add(new EmailOutboxMessage
            {
                Id = rowId,
                EventType = "OrderConfirmation",
                Payload = Guid.NewGuid().ToString(),
                IdempotencyKey = "retention-keep-key",
                Status = OutboxMessageStatus.Sent,
                DeliveredAt = DateTimeOffset.UtcNow.AddDays(-1),
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<EmailOutboxRetentionService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var exists = await db.EmailOutboxMessages.AnyAsync(m => m.Id == rowId);
            Assert.True(exists);
        }
    }

    [Fact]
    public async Task PurgeOnceAsync_keeps_old_pending_messages()
    {
        var rowId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.EmailOutboxMessages.Add(new EmailOutboxMessage
            {
                Id = rowId,
                EventType = "OrderConfirmation",
                Payload = Guid.NewGuid().ToString(),
                IdempotencyKey = "retention-pending-key",
                Status = OutboxMessageStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-100),
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<EmailOutboxRetentionService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var exists = await db.EmailOutboxMessages.AnyAsync(m => m.Id == rowId);
            Assert.True(exists);
        }
    }

    [Fact]
    public async Task PurgeOnceAsync_purges_failed_messages_without_last_attempt()
    {
        var rowId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.EmailOutboxMessages.Add(new EmailOutboxMessage
            {
                Id = rowId,
                EventType = "OrderConfirmation",
                Payload = Guid.NewGuid().ToString(),
                IdempotencyKey = "retention-failed-key",
                Status = OutboxMessageStatus.Failed,
                DeliveredAt = null,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-100),
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<EmailOutboxRetentionService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var exists = await db.EmailOutboxMessages.AnyAsync(m => m.Id == rowId);
            Assert.False(exists);
        }
    }

    [Fact]
    public async Task PurgeOnceAsync_keeps_recent_failed_messages()
    {
        var rowId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.EmailOutboxMessages.Add(new EmailOutboxMessage
            {
                Id = rowId,
                EventType = "OrderConfirmation",
                Payload = Guid.NewGuid().ToString(),
                IdempotencyKey = "retention-recent-failed-key",
                Status = OutboxMessageStatus.Failed,
                DeliveredAt = null,
                LastAttemptAt = DateTimeOffset.UtcNow.AddDays(-1),
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-100),
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<EmailOutboxRetentionService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var exists = await db.EmailOutboxMessages.AnyAsync(m => m.Id == rowId);
            Assert.True(exists);
        }
    }

    [Fact]
    public async Task PurgeOnceAsync_is_idempotent()
    {
        var rowId = Guid.NewGuid();
        var cutoff = DateTimeOffset.UtcNow.AddDays(-100);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.EmailOutboxMessages.Add(new EmailOutboxMessage
            {
                Id = rowId,
                EventType = "OrderConfirmation",
                Payload = Guid.NewGuid().ToString(),
                IdempotencyKey = "retention-idemp-key",
                Status = OutboxMessageStatus.Sent,
                DeliveredAt = cutoff,
                CreatedAt = cutoff,
            });
            await db.SaveChangesAsync();
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<EmailOutboxRetentionService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var count = await db.EmailOutboxMessages.CountAsync(m => m.Id == rowId);
            Assert.Equal(0, count);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<EmailOutboxRetentionService>();
            await service.PurgeOnceAsync(CancellationToken.None);
        }
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            var hosted = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IHostedService) &&
                d.ImplementationType == typeof(EmailOutboxRetentionService));
            if (hosted is not null)
                services.Remove(hosted);

            services.AddTransient<EmailOutboxRetentionService>();
        }
    }
}
