using Coravel.Invocable;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Fire-and-forget jobs queued by the orders slices. Each job opens its own
/// scoped DbContext, builds an <see cref="EmailMessage"/>, and hands it to
/// <see cref="IEmailSender"/>. Coravel handles retries + isolation.
/// </summary>
public sealed class SendOrderConfirmationJob : IInvocable, IInvocableWithPayload<Guid>
{
    public Guid Payload { get; set; }

    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<SendOrderConfirmationJob> _logger;

    public SendOrderConfirmationJob(AppDbContext db, IEmailSender email, ILogger<SendOrderConfirmationJob> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task Invoke()
    {
        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == Payload);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
        {
            _logger.LogWarning("OrderConfirmation skipped — order or email missing for {OrderId}", Payload);
            return;
        }

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

        // Subject is derived from the payment kind so a later transition doesn't
        // rewrite it (job may run minutes after queueing).
        var subject = order.PaymentMethodKind == PaymentMethodKind.Cod
            ? $"Order {order.OrderNumber} confirmed"
            : $"Order {order.OrderNumber} — awaiting payment";

        await _email.SendAsync(new EmailMessage(
            To: order.BuyerUser.Email,
            Subject: subject,
            TextBody: body));
    }
}

/// <summary>
/// Notifies the buyer that admin has received their payment proof and is reviewing it.
/// </summary>
public sealed class SendPaymentReviewNeededJob : IInvocable, IInvocableWithPayload<Guid>
{
    public Guid Payload { get; set; }

    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<SendPaymentReviewNeededJob> _logger;

    public SendPaymentReviewNeededJob(AppDbContext db, IEmailSender email, ILogger<SendPaymentReviewNeededJob> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task Invoke()
    {
        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .FirstOrDefaultAsync(o => o.Id == Payload);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
        {
            _logger.LogWarning("PaymentReviewNeeded skipped for {OrderId}", Payload);
            return;
        }

        await _email.SendAsync(new EmailMessage(
            To: order.BuyerUser.Email,
            Subject: $"Order {order.OrderNumber} — payment proof received",
            TextBody:
                $"Hi {order.BuyerUser.FullName},\n\n" +
                $"We received your payment proof for order {order.OrderNumber} and it's now waiting on our team to review " +
                $"(usually within a business day). You'll get another email the moment it's confirmed.\n\n— Dr. Mirror"));
    }
}

/// <summary>
/// Carries the order id alongside the status that triggered the email, so a
/// later transition (committed before the job actually runs) doesn't rewrite
/// the subject line. <see cref="EventStatus"/> is the captured event, not the
/// order's current status when the job executes.
/// </summary>
public sealed record OrderStatusChangedPayload(Guid OrderId, OrderStatus EventStatus);

/// <summary>
/// Fires whenever the order status moves to a new state worth notifying the buyer about.
/// </summary>
public sealed class SendStatusChangedJob : IInvocable, IInvocableWithPayload<OrderStatusChangedPayload>
{
    public OrderStatusChangedPayload Payload { get; set; } = new(Guid.Empty, OrderStatus.Pending);

    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<SendStatusChangedJob> _logger;

    public SendStatusChangedJob(AppDbContext db, IEmailSender email, ILogger<SendStatusChangedJob> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task Invoke()
    {
        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .FirstOrDefaultAsync(o => o.Id == Payload.OrderId);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
        {
            _logger.LogWarning("StatusChanged skipped for {OrderId}", Payload.OrderId);
            return;
        }

        // Use the captured status, not the live one — the order may have moved
        // forward again between queue time and now.
        var (subject, body) = Payload.EventStatus switch
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
            _ => ($"Order {order.OrderNumber} — status update", $"Status: {Payload.EventStatus}"),
        };

        await _email.SendAsync(new EmailMessage(
            To: order.BuyerUser.Email,
            Subject: subject,
            TextBody: body));
    }
}
