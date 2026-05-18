using System.Collections.Concurrent;
using System.Reflection;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Email;

[Collection(IntegrationTestCollection.Name)]
public class OutboxContentionTests : IClassFixture<OutboxContentionTests.Factory>
{
    private readonly Factory _factory;

    public OutboxContentionTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Two_concurrent_processors_dispatch_each_message_exactly_once()
    {
        _factory.ResetSender();
        var messageIds = await _factory.SeedMessagesAsync(count: 6);

        var batch1 = messageIds.Take(3).ToArray();
        var batch2 = messageIds.Skip(3).ToArray();

        var task1 = ClaimAndDispatchAsync(batch1, "worker-1");
        var task2 = ClaimAndDispatchAsync(batch2, "worker-2");
        await Task.WhenAll(task1, task2);

        var sender = (RecordingEmailSender)_factory.Services.GetRequiredService<IEmailSender>();
        Assert.Equal(messageIds.Length, sender.DispatchedSubjects.Count);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var messages = await db.EmailOutboxMessages
            .Where(m => messageIds.Contains(m.Id))
            .ToListAsync();

        Assert.All(messages, m =>
        {
            Assert.Equal(OutboxMessageStatus.Sent, m.Status);
            Assert.Equal(1, m.Attempts);
            Assert.Null(m.LockedAt);
            Assert.Null(m.LockedBy);
        });
    }

    [Fact]
    public async Task Processor_does_not_steal_messages_locked_by_another_worker()
    {
        _factory.ResetSender();
        var allIds = await _factory.SeedMessagesAsync(count: 4);
        var lockedIds = allIds.Take(2).ToArray();
        var freeIds = allIds.Skip(2).ToArray();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            foreach (var id in lockedIds)
            {
                var msg = await db.EmailOutboxMessages.FindAsync(id);
                msg!.Status = OutboxMessageStatus.Processing;
                msg.LockedAt = DateTimeOffset.UtcNow;
                msg.LockedBy = "other-worker-" + Guid.NewGuid();
                msg.Attempts = 1;
                msg.LastAttemptAt = DateTimeOffset.UtcNow;
            }
            await db.SaveChangesAsync();
        }

        await ClaimAndDispatchAsync(freeIds, "current-worker");

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();

        foreach (var id in lockedIds)
        {
            var msg = await db2.EmailOutboxMessages.FindAsync(id);
            Assert.Equal(OutboxMessageStatus.Processing, msg!.Status);
            Assert.Equal(1, msg.Attempts);
            Assert.NotNull(msg.LockedBy);
            Assert.StartsWith("other-worker-", msg.LockedBy);
        }

        foreach (var id in freeIds)
        {
            var msg = await db2.EmailOutboxMessages.FindAsync(id);
            Assert.Equal(OutboxMessageStatus.Sent, msg!.Status);
            Assert.Equal(1, msg.Attempts);
            Assert.Null(msg.LockedAt);
            Assert.Null(msg.LockedBy);
        }

        var sender = (RecordingEmailSender)_factory.Services.GetRequiredService<IEmailSender>();
        Assert.Equal(2, sender.DispatchedSubjects.Count);
    }

    private async Task ClaimAndDispatchAsync(Guid[] messageIds, string workerId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var emailOpts = scope.ServiceProvider.GetRequiredService<IOptions<EmailOptions>>().Value;

        var now = DateTimeOffset.UtcNow;

        foreach (var id in messageIds)
        {
            var msg = await db.EmailOutboxMessages.FindAsync(id);
            msg!.Status = OutboxMessageStatus.Processing;
            msg.LockedAt = now;
            msg.LockedBy = workerId;
            msg.Attempts++;
            msg.LastAttemptAt = now;
        }
        await db.SaveChangesAsync();

        var dispatchMethod = typeof(EmailOutboxProcessor).Assembly
            .GetType("DrMirror.Api.Infrastructure.Email.OutboxMessageDispatcher")!
            .GetMethod("DispatchAsync", BindingFlags.Static | BindingFlags.NonPublic)!;

        foreach (var id in messageIds)
        {
            var msg = await db.EmailOutboxMessages.FindAsync(id);
            if (msg!.LockedBy != workerId || msg.Status != OutboxMessageStatus.Processing)
                continue;

            await (Task)dispatchMethod.Invoke(null, [msg, db, email, emailOpts, CancellationToken.None])!;
            msg.Status = OutboxMessageStatus.Sent;
            msg.DeliveredAt = DateTimeOffset.UtcNow;
            msg.LockedAt = null;
            msg.LockedBy = null;
            await db.SaveChangesAsync();
        }
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "OutboxContentionTest_" + Guid.NewGuid();

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            var descriptor = services.FirstOrDefault(d => d.ServiceType == typeof(IEmailSender));
            if (descriptor is not null)
                services.Remove(descriptor);
            services.AddSingleton<IEmailSender, RecordingEmailSender>();
        }

        public void ResetSender()
        {
            var sender = (RecordingEmailSender)Services.GetRequiredService<IEmailSender>();
            sender.DispatchedSubjects.Clear();
        }

        public async Task<Guid[]> SeedMessagesAsync(int count)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ids = new Guid[count];

            for (var i = 0; i < count; i++)
            {
                var userId = Guid.NewGuid();
                var orderId = Guid.NewGuid();
                ids[i] = Guid.NewGuid();

                db.Users.Add(new User
                {
                    Id = userId,
                    FullName = $"Contention User {i}",
                    Email = $"contention-{i}@example.com",
                    UserName = $"contention-{i}@example.com",
                });
                db.Orders.Add(new Order
                {
                    Id = orderId,
                    OrderNumber = $"DM-CONT-{Guid.NewGuid():N}"[..18],
                    Status = OrderStatus.Pending,
                    BuyerUserId = userId,
                    Currency = "EGP",
                    PaymentMethodKind = PaymentMethodKind.Cod,
                    Total = 100,
                    SubTotal = 100,
                });
                db.EmailOutboxMessages.Add(new EmailOutboxMessage
                {
                    Id = ids[i],
                    EventType = "OrderConfirmation",
                    Payload = orderId.ToString(),
                    IdempotencyKey = $"contention-{i}",
                    Status = OutboxMessageStatus.Pending,
                    Attempts = 0,
                    NextRetryAt = DateTimeOffset.UtcNow,
                    CreatedAt = DateTimeOffset.UtcNow,
                });
            }

            await db.SaveChangesAsync();
            return ids;
        }
    }
}

internal sealed class RecordingEmailSender : IEmailSender
{
    public ConcurrentBag<string> DispatchedSubjects { get; } = new();

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        DispatchedSubjects.Add(message.Subject);
        return Task.CompletedTask;
    }
}
