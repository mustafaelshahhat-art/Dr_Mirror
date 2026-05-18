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

namespace DrMirror.Tests.Email;

[Collection(IntegrationTestCollection.Name)]
public class OutboxBackoffCeilingTests : IClassFixture<OutboxBackoffCeilingTests.Factory>
{
    private readonly Factory _factory;

    public OutboxBackoffCeilingTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Processor_clamps_retry_delay_to_configured_max_backoff()
    {
        var messageId = await SeedMessageAsync(attempts: 4);
        var before = DateTimeOffset.UtcNow;

        await RunProcessorBatchAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.EmailOutboxMessages.SingleAsync(m => m.Id == messageId);
        Assert.Equal(OutboxMessageStatus.Pending, row.Status);
        Assert.Equal(5, row.Attempts);
        Assert.NotNull(row.FailureReason);
        Assert.True(row.NextRetryAt - before <= TimeSpan.FromMinutes(1).Add(TimeSpan.FromSeconds(5)));
    }

    private async Task<Guid> SeedMessageAsync(int attempts)
    {
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
            FullName = "Outbox Backoff User",
            Email = $"backoff-{userId:N}@example.com",
            UserName = $"backoff-{userId:N}@example.com",
        });
        db.Orders.Add(new Order
        {
            Id = orderId,
            OrderNumber = $"DM-BACK-{Guid.NewGuid():N}"[..18],
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
            IdempotencyKey = $"backoff-{messageId:N}",
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
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            var hosted = services.FirstOrDefault(d =>
                d.ServiceType == typeof(IHostedService) &&
                d.ImplementationType == typeof(EmailOutboxProcessor));
            if (hosted is not null)
                services.Remove(hosted);

            foreach (var d in services.Where(d => d.ServiceType == typeof(IEmailSender)).ToList())
                services.Remove(d);
            services.AddSingleton<IEmailSender, ThrowingEmailSender>();

            services.PostConfigure<EmailOptions>(options =>
            {
                options.MaxAttempts = 7;
                options.MaxBackoff = TimeSpan.FromMinutes(1);
            });
        }
    }

    private sealed class ThrowingEmailSender : IEmailSender
    {
        public Task SendAsync(EmailMessage message, CancellationToken ct = default) =>
            throw new InvalidOperationException("Simulated SMTP failure");
    }
}
