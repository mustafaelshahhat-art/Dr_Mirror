using Coravel.Invocable;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

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

        int[] delays = { 0, 5000, 30000, 120000 };
        for (int attempt = 1; attempt <= 4; attempt++)
        {
            if (attempt > 1) await Task.Delay(delays[attempt - 1]);
            
            try
            {
                await _email.SendAsync(new EmailMessage(
                    To: order.BuyerUser.Email,
                    Subject: subject,
                    TextBody: body));
                return;
            }
            catch (Exception ex)
            {
                if (attempt < 4)
                    _logger.LogWarning(ex, "Failed to send SendOrderConfirmationJob to {Recipient}. Attempt {Attempt}/4.", order.BuyerUser.Email, attempt);
                else
                    _logger.LogError(ex, "Failed to send SendOrderConfirmationJob to {Recipient} after 4 attempts. OrderId: {OrderId}", order.BuyerUser.Email, Payload);
            }
        }
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

        int[] delays = { 0, 5000, 30000, 120000 };
        for (int attempt = 1; attempt <= 4; attempt++)
        {
            if (attempt > 1) await Task.Delay(delays[attempt - 1]);
            
            try
            {
                await _email.SendAsync(new EmailMessage(
                    To: order.BuyerUser.Email,
                    Subject: $"Order {order.OrderNumber} — payment proof received",
                    TextBody:
                        $"Hi {order.BuyerUser.FullName},\n\n" +
                        $"We received your payment proof for order {order.OrderNumber} and it's now waiting on our team to review " +
                        $"(usually within a business day). You'll get another email the moment it's confirmed.\n\n— Dr. Mirror"));
                return;
            }
            catch (Exception ex)
            {
                if (attempt < 4)
                    _logger.LogWarning(ex, "Failed to send SendPaymentReviewNeededJob to {Recipient}. Attempt {Attempt}/4.", order.BuyerUser.Email, attempt);
                else
                    _logger.LogError(ex, "Failed to send SendPaymentReviewNeededJob to {Recipient} after 4 attempts. OrderId: {OrderId}", order.BuyerUser.Email, Payload);
            }
        }
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

        int[] delays = { 0, 5000, 30000, 120000 };
        for (int attempt = 1; attempt <= 4; attempt++)
        {
            if (attempt > 1) await Task.Delay(delays[attempt - 1]);
            
            try
            {
                await _email.SendAsync(new EmailMessage(
                    To: order.BuyerUser.Email,
                    Subject: subject,
                    TextBody: body));
                return;
            }
            catch (Exception ex)
            {
                if (attempt < 4)
                    _logger.LogWarning(ex, "Failed to send SendStatusChangedJob to {Recipient}. Attempt {Attempt}/4.", order.BuyerUser.Email, attempt);
                else
                    _logger.LogError(ex, "Failed to send SendStatusChangedJob to {Recipient} after 4 attempts. OrderId: {OrderId}", order.BuyerUser.Email, Payload.OrderId);
            }
        }
    }
}

/// <summary>
/// Fires when a visitor submits an inquiry. Sends a notification email to the
/// configured admin address so staff are aware without polling the inbox.
/// </summary>
public sealed class SendInquiryReceivedJob : IInvocable, IInvocableWithPayload<Guid>
{
    public Guid Payload { get; set; }

    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly EmailOptions _emailOptions;
    private readonly ILogger<SendInquiryReceivedJob> _logger;

    public SendInquiryReceivedJob(
        AppDbContext db,
        IEmailSender email,
        IOptions<EmailOptions> emailOptions,
        ILogger<SendInquiryReceivedJob> logger)
    {
        _db = db;
        _email = email;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    public async Task Invoke()
    {
        var inquiry = await _db.Inquiries
            .AsNoTracking()
            .Include(i => i.Product)
            .FirstOrDefaultAsync(i => i.Id == Payload);

        if (inquiry is null)
        {
            _logger.LogWarning("InquiryReceived skipped — inquiry {InquiryId} not found", Payload);
            return;
        }

        var adminEmail = _emailOptions.AdminNotificationEmail ?? _emailOptions.FromAddress;

        var productLine = inquiry.Product is not null
            ? $"Product: {inquiry.Product.NameEn}\n"
            : "";

        var body =
            $"New inquiry received on Dr. Mirror.\n\n" +
            $"From: {inquiry.FullName} <{inquiry.Email}>" +
            (inquiry.Phone is not null ? $" | {inquiry.Phone}" : "") + "\n" +
            productLine +
            $"Subject: {inquiry.Subject}\n\n" +
            $"Message:\n{inquiry.Message}\n\n" +
            $"View in admin: /admin/inquiries\n" +
            $"— Dr. Mirror System";

        int[] delays = { 0, 5000, 30000, 120000 };
        for (int attempt = 1; attempt <= 4; attempt++)
        {
            if (attempt > 1) await Task.Delay(delays[attempt - 1]);
            
            try
            {
                await _email.SendAsync(new EmailMessage(
                    To: adminEmail,
                    Subject: $"[Dr. Mirror] New inquiry: {inquiry.Subject}",
                    TextBody: body));
                return;
            }
            catch (Exception ex)
            {
                if (attempt < 4)
                    _logger.LogWarning(ex, "Failed to send SendInquiryReceivedJob to {Recipient}. Attempt {Attempt}/4.", adminEmail, attempt);
                else
                    _logger.LogError(ex, "Failed to send SendInquiryReceivedJob to {Recipient} after 4 attempts. InquiryId: {InquiryId}", adminEmail, Payload);
            }
        }
    }
}
