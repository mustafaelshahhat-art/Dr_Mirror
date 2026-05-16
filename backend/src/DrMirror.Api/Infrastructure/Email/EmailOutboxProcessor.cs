using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.Email;

public sealed class EmailOutboxProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailOutboxProcessor> _logger;

    public EmailOutboxProcessor(IServiceScopeFactory scopeFactory, ILogger<EmailOutboxProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "EmailOutboxProcessor: unexpected error during batch");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), ct).ConfigureAwait(false);
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var emailOptions = scope.ServiceProvider.GetRequiredService<IOptions<EmailOptions>>().Value;

        const int maxAttempts = 10;
        var now = DateTimeOffset.UtcNow;

        var pending = await db.EmailOutboxMessages
            .Where(m => m.Status == OutboxMessageStatus.Pending
                     && m.Attempts < maxAttempts
                     && m.NextRetryAt <= now)
            .Take(20)
            .ToListAsync(ct);

        foreach (var msg in pending)
        {
            msg.Attempts++;
            msg.LastAttemptAt = DateTimeOffset.UtcNow;
            try
            {
                await DispatchAsync(msg, db, email, emailOptions, ct);
                msg.Status = OutboxMessageStatus.Sent;
                msg.DeliveredAt = DateTimeOffset.UtcNow;
                _logger.LogInformation("EmailOutbox: sent {EventType} (id={Id})", msg.EventType, msg.Id);
            }
            catch (Exception ex)
            {
                msg.FailureReason = ex.Message;
                if (msg.Attempts >= maxAttempts)
                {
                    msg.Status = OutboxMessageStatus.Failed;
                    _logger.LogError(ex,
                        "EmailOutbox: permanently failed {EventType} (id={Id}) after {Attempts} attempts",
                        msg.EventType, msg.Id, msg.Attempts);
                }
                else
                {
                    // Exponential backoff: 30s, 2m, 8m, 30m, 2h, …
                    msg.NextRetryAt = DateTimeOffset.UtcNow
                        .AddSeconds(Math.Pow(4, msg.Attempts) * 30);
                    _logger.LogWarning(ex,
                        "EmailOutbox: attempt {Attempts} failed for {EventType} (id={Id}), retry at {NextRetry}",
                        msg.Attempts, msg.EventType, msg.Id, msg.NextRetryAt);
                }
            }
            await db.SaveChangesAsync(ct);
        }
    }

    private static async Task DispatchAsync(
        EmailOutboxMessage msg,
        AppDbContext db,
        IEmailSender email,
        EmailOptions emailOptions,
        CancellationToken ct)
    {
        switch (msg.EventType)
        {
            case "OrderConfirmation":
                await SendOrderConfirmationAsync(Guid.Parse(msg.Payload), db, email, ct);
                break;
            case "PaymentReviewNeeded":
                await SendPaymentReviewNeededAsync(Guid.Parse(msg.Payload), db, email, ct);
                break;
            case "StatusChanged":
                var p = JsonSerializer.Deserialize<EmailOutboxHelper.StatusChangedPayload>(msg.Payload)!;
                await SendStatusChangedAsync(p.OrderId, p.Status, db, email, ct);
                break;
            case "InquiryReceived":
                await SendInquiryReceivedAsync(Guid.Parse(msg.Payload), db, email, emailOptions, ct);
                break;
            default:
                throw new InvalidOperationException($"Unknown outbox event type: {msg.EventType}");
        }
    }

    private static async Task SendOrderConfirmationAsync(Guid orderId, AppDbContext db, IEmailSender email, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
            return;

        var lines = string.Join('\n', order.Items.Select(i =>
            $"  • {i.NameEn} ({i.Size} / {i.ColorName}) ×{i.Quantity} — {i.LineTotal:N2} {order.Currency}"));

        var body = order.PaymentMethodKind switch
        {
            PaymentMethodKind.Cod =>
                $"Hi {order.BuyerUser.FullName},\n\n" +
                $"Your order {order.OrderNumber} is confirmed.\n" +
                $"You will pay {order.Total:N2} {order.Currency} in cash to the courier on delivery.\n\n" +
                $"Items:\n{lines}\n\n— Dr. Mirror",
            _ =>
                $"Hi {order.BuyerUser.FullName},\n\n" +
                $"Your order {order.OrderNumber} is awaiting payment ({order.Total:N2} {order.Currency}).\n" +
                $"Transfer the amount to the account shown at checkout and upload a screenshot in your account → orders page.\n\n" +
                $"Items:\n{lines}\n\n— Dr. Mirror",
        };

        var subject = order.PaymentMethodKind == PaymentMethodKind.Cod
            ? $"Order {order.OrderNumber} confirmed"
            : $"Order {order.OrderNumber} — awaiting payment";

        await email.SendAsync(new EmailMessage(
            To: order.BuyerUser.Email,
            Subject: subject,
            TextBody: body));
    }

    private static async Task SendPaymentReviewNeededAsync(Guid orderId, AppDbContext db, IEmailSender email, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
            return;

        await email.SendAsync(new EmailMessage(
            To: order.BuyerUser.Email,
            Subject: $"Order {order.OrderNumber} — payment proof received",
            TextBody:
                $"Hi {order.BuyerUser.FullName},\n\n" +
                $"We received your payment proof for order {order.OrderNumber} and it's now waiting on our team to review " +
                $"(usually within a business day). You'll get another email the moment it's confirmed.\n\n— Dr. Mirror"));
    }

    private static async Task SendStatusChangedAsync(Guid orderId, OrderStatus eventStatus, AppDbContext db, IEmailSender email, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
            return;

        var (subject, body) = eventStatus switch
        {
            OrderStatus.Paid => (
                $"Order {order.OrderNumber} — payment confirmed",
                $"Hi {order.BuyerUser.FullName},\n\nWe've confirmed your payment. We'll start preparing your order shortly.\n\n— Dr. Mirror"),
            OrderStatus.Preparing => (
                $"Order {order.OrderNumber} — preparing",
                $"Hi {order.BuyerUser.FullName},\n\nWe're packing your order now. You'll get another email when it's on its way.\n\n— Dr. Mirror"),
            OrderStatus.Shipped => (
                $"Order {order.OrderNumber} — shipped",
                $"Hi {order.BuyerUser.FullName},\n\nYour order is on its way. Have your phone reachable for the courier.\n\n— Dr. Mirror"),
            OrderStatus.Delivered => (
                $"Order {order.OrderNumber} — delivered",
                $"Hi {order.BuyerUser.FullName},\n\nYour order was delivered. Thanks for shopping with Dr. Mirror.\n\n— Dr. Mirror"),
            OrderStatus.Cancelled => (
                $"Order {order.OrderNumber} — cancelled",
                $"Hi {order.BuyerUser.FullName},\n\nYour order has been cancelled.\n" +
                (string.IsNullOrWhiteSpace(order.CancellationReason) ? "" : $"Reason: {order.CancellationReason}\n") +
                $"\n— Dr. Mirror"),
            _ => ($"Order {order.OrderNumber} — status update", $"Status: {eventStatus}"),
        };

        await email.SendAsync(new EmailMessage(
            To: order.BuyerUser.Email,
            Subject: subject,
            TextBody: body));
    }

    private static async Task SendInquiryReceivedAsync(Guid inquiryId, AppDbContext db, IEmailSender email, EmailOptions opts, CancellationToken ct)
    {
        var inquiry = await db.Inquiries
            .AsNoTracking()
            .Include(i => i.Product)
            .FirstOrDefaultAsync(i => i.Id == inquiryId, ct);

        if (inquiry is null)
            return;

        var adminEmail = opts.AdminNotificationEmail ?? opts.FromAddress;
        var productLine = inquiry.Product is not null ? $"Product: {inquiry.Product.NameEn}\n" : "";

        var body =
            $"New inquiry received on Dr. Mirror.\n\n" +
            $"From: {inquiry.FullName} <{inquiry.Email}>" +
            (inquiry.Phone is not null ? $" | {inquiry.Phone}" : "") + "\n" +
            productLine +
            $"Subject: {inquiry.Subject}\n\n" +
            $"Message:\n{inquiry.Message}\n\n" +
            $"View in admin: /admin/inquiries\n" +
            $"— Dr. Mirror System";

        await email.SendAsync(new EmailMessage(
            To: adminEmail,
            Subject: $"[Dr. Mirror] New inquiry: {inquiry.Subject}",
            TextBody: body));
    }
}
