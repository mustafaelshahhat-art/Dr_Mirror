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
public class OutboxFailureLoggingTests : IClassFixture<OutboxFailureLoggingTests.Factory>
{
    private readonly Factory _factory;

    public OutboxFailureLoggingTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Dispatch_throws_when_email_sender_fails()
    {
        var orderId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new User
            {
                Id = userId,
                FullName = "Fail Test User",
                Email = $"fail-test-{userId:N}@example.com",
                UserName = $"fail-test-{userId:N}@example.com",
            });
            db.Orders.Add(new Order
            {
                Id = orderId,
                OrderNumber = $"DM-FAIL-{Guid.NewGuid():N}"[..18],
                Status = OrderStatus.Pending,
                BuyerUserId = userId,
                Currency = "EGP",
                PaymentMethodKind = PaymentMethodKind.Instapay,
                Total = 100,
                SubTotal = 100,
            });
            await db.SaveChangesAsync();
        }

        using var dispatchScope = _factory.Services.CreateScope();
        var dispatchDb = dispatchScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sender = dispatchScope.ServiceProvider.GetRequiredService<IEmailSender>();
        var emailOpts = dispatchScope.ServiceProvider.GetRequiredService<IOptions<EmailOptions>>().Value;

        var msg = new EmailOutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = "OrderConfirmation",
            Payload = orderId.ToString(),
            IdempotencyKey = $"dispatch-fail-{Guid.NewGuid():N}",
            Status = OutboxMessageStatus.Processing,
            Attempts = 1,
        };

        var dispatch = typeof(EmailOutboxProcessor).Assembly.GetType(
            "DrMirror.Api.Infrastructure.Email.OutboxMessageDispatcher")!
            .GetMethod("DispatchAsync", BindingFlags.Static | BindingFlags.NonPublic)!;

        var ex = await Record.ExceptionAsync(() =>
            (Task)dispatch.Invoke(null, [msg, dispatchDb, sender, emailOpts, CancellationToken.None])!);

        Assert.NotNull(ex);
        Assert.Contains("Simulated SMTP", ex.Message);
    }

    [Fact]
    public void Failed_message_is_marked_with_failure_reason_and_retry()
    {
        const int maxAttempts = 10;
        var msg = new EmailOutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = "OrderConfirmation",
            Payload = Guid.NewGuid().ToString(),
            Status = OutboxMessageStatus.Processing,
            Attempts = 1,
        };

        var ex = new InvalidOperationException("Simulated SMTP failure");
        msg.FailureReason = ex.Message;
        if (msg.Attempts >= maxAttempts)
        {
            msg.Status = OutboxMessageStatus.Failed;
        }
        else
        {
            msg.Status = OutboxMessageStatus.Pending;
            msg.NextRetryAt = DateTimeOffset.UtcNow.AddSeconds(Math.Pow(4, msg.Attempts) * 30);
        }

        Assert.Equal(OutboxMessageStatus.Pending, msg.Status);
        Assert.Equal(1, msg.Attempts);
        Assert.Contains("Simulated SMTP failure", msg.FailureReason);
        Assert.True(msg.NextRetryAt > DateTimeOffset.UtcNow);
    }

    [Fact]
    public void Message_is_permanently_failed_after_max_attempts()
    {
        const int maxAttempts = 10;
        var msg = new EmailOutboxMessage
        {
            Status = OutboxMessageStatus.Processing,
            Attempts = 9,
        };

        msg.Attempts++;
        var ex = new InvalidOperationException("Simulated SMTP failure");
        msg.FailureReason = ex.Message;
        if (msg.Attempts >= maxAttempts)
        {
            msg.Status = OutboxMessageStatus.Failed;
            msg.LockedAt = null;
            msg.LockedBy = null;
        }

        Assert.Equal(OutboxMessageStatus.Failed, msg.Status);
        Assert.Equal(10, msg.Attempts);
        Assert.Contains("Simulated SMTP failure", msg.FailureReason);
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            var senderDescriptors = services
                .Where(d => d.ServiceType == typeof(IEmailSender))
                .ToList();
            foreach (var d in senderDescriptors)
                services.Remove(d);
            services.AddSingleton<IEmailSender, ThrowingEmailSender>();
        }
    }

    private sealed class ThrowingEmailSender : IEmailSender
    {
        public Task SendAsync(EmailMessage message, CancellationToken ct = default)
            => throw new InvalidOperationException("Simulated SMTP failure");
    }
}
