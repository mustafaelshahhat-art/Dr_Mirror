using System.Reflection;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Email;

[Collection(IntegrationTestCollection.Name)]
public class OutboxMaxAttemptsConfigurableTests : IClassFixture<OutboxMaxAttemptsConfigurableTests.Factory>
{
    private readonly Factory _factory;

    public OutboxMaxAttemptsConfigurableTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Processor_uses_configured_max_attempts_and_marks_message_failed()
    {
        var messageId = await SeedMessageAsync(attempts: 2);

        await RunProcessorBatchAsync();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var row = await db.EmailOutboxMessages.SingleAsync(m => m.Id == messageId);
            Assert.Equal(OutboxMessageStatus.Failed, row.Status);
            Assert.Equal(3, row.Attempts);
            Assert.NotNull(row.FailureReason);
            Assert.Null(row.LockedAt);
            Assert.Null(row.LockedBy);

            var now = DateTimeOffset.UtcNow;
            var maxAttempts = scope.ServiceProvider.GetRequiredService<IOptions<EmailOptions>>().Value.MaxAttempts;
            var isClaimable = await db.EmailOutboxMessages.AnyAsync(m => m.Id == messageId
                && m.Attempts < maxAttempts
                && ((m.Status == OutboxMessageStatus.Pending && m.NextRetryAt <= now)
                    || (m.Status == OutboxMessageStatus.Processing && m.LockedAt <= now.AddMinutes(-5))));
            Assert.False(isClaimable);
        }

        await RunProcessorBatchAsync();
        Assert.Equal(1, _factory.Sender.SendAttempts);
    }

    private async Task<Guid> SeedMessageAsync(int attempts)
    {
        _factory.Sender.Reset();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.EmailOutboxMessages.RemoveRange(db.EmailOutboxMessages);
        db.Orders.RemoveRange(db.Orders);
        db.Users.RemoveRange(db.Users);
        await db.SaveChangesAsync();

        var userId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var messageId = Guid.NewGuid();
        db.Users.Add(new User
        {
            Id = userId,
            FullName = "Outbox Max Attempts User",
            Email = $"max-attempts-{userId:N}@example.com",
            UserName = $"max-attempts-{userId:N}@example.com",
        });
        db.Orders.Add(new Order
        {
            Id = orderId,
            OrderNumber = $"DM-MAX-{Guid.NewGuid():N}"[..18],
            Status = OrderStatus.Pending,
            BuyerUserId = userId,
            Currency = "EGP",
            PaymentMethodKind = PaymentMethodKind.Instapay,
            Total = 100,
            SubTotal = 100,
        });
        db.EmailOutboxMessages.Add(new EmailOutboxMessage
        {
            Id = messageId,
            EventType = "OrderConfirmation",
            Payload = orderId.ToString(),
            IdempotencyKey = $"max-attempts-{messageId:N}",
            Status = OutboxMessageStatus.Pending,
            Attempts = attempts,
            NextRetryAt = DateTimeOffset.UtcNow.AddSeconds(-1),
            CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-1),
        });
        await db.SaveChangesAsync();
        return messageId;
    }

    private Task RunProcessorBatchAsync()
    {
        var processor = new EmailOutboxProcessor(
            _factory.Services.GetRequiredService<IServiceScopeFactory>(),
            _factory.Services.GetRequiredService<ILogger<EmailOutboxProcessor>>());
        var method = typeof(EmailOutboxProcessor).GetMethod("ProcessBatchAsync", BindingFlags.Instance | BindingFlags.NonPublic)!;
        return (Task)method.Invoke(processor, [CancellationToken.None])!;
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        public ThrowingEmailSender Sender { get; } = new();

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            var hosted = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IHostedService) &&
                d.ImplementationType == typeof(EmailOutboxProcessor));
            if (hosted is not null)
                services.Remove(hosted);

            foreach (var d in services.Where(d => d.ServiceType == typeof(IEmailSender)).ToList())
                services.Remove(d);
            services.AddSingleton<IEmailSender>(Sender);

            services.PostConfigure<EmailOptions>(options =>
            {
                options.MaxAttempts = 3;
                options.MaxBackoff = TimeSpan.FromMinutes(1);
            });
        }
    }

    public sealed class ThrowingEmailSender : IEmailSender
    {
        public int SendAttempts { get; private set; }

        public void Reset() => SendAttempts = 0;

        public Task SendAsync(EmailMessage message, CancellationToken ct = default)
        {
            SendAttempts++;
            throw new InvalidOperationException("Simulated SMTP failure");
        }
    }
}
