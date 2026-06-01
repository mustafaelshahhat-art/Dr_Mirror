using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Routes a single <see cref="EmailOutboxMessage"/> to its concrete send
/// implementation. Separated from <see cref="EmailOutboxProcessor"/> so the
/// retry/scheduling loop and the per-event dispatch table have distinct,
/// narrow responsibilities.
///
/// Language note: for order/return events the customer's language is read from
/// <c>BuyerUser.Language</c> at dispatch time. Because dispatch runs seconds after
/// enqueue, this is effectively the customer's stored language at the moment of the
/// event — and admin-triggered events therefore render in the <b>customer's</b>
/// language, never the admin's. For inquiry confirmations (which have no user row)
/// the language is frozen into the payload at enqueue time instead.
/// </summary>
internal static class OutboxMessageDispatcher
{
    internal static Task DispatchAsync(
        EmailOutboxMessage msg,
        AppDbContext db,
        IEmailSender email,
        EmailOptions emailOptions,
        CancellationToken ct) => msg.EventType switch
    {
        "OrderConfirmation" =>
            SendOrderConfirmationAsync(Guid.Parse(msg.Payload), db, email, emailOptions, ct),
        "PaymentReviewNeeded" =>
            SendPaymentReviewNeededAsync(Guid.Parse(msg.Payload), db, email, emailOptions, ct),
        "StatusChanged" =>
            SendStatusChangedAsync(
                JsonSerializer.Deserialize<EmailOutboxHelper.StatusChangedPayload>(msg.Payload)!,
                db, email, emailOptions, ct),
        "ReturnStatusChanged" =>
            SendReturnStatusChangedAsync(
                JsonSerializer.Deserialize<EmailOutboxHelper.ReturnStatusChangedPayload>(msg.Payload)!,
                db, email, ct),
        "ReturnCreated" =>
            SendReturnCreatedAsync(Guid.Parse(msg.Payload), db, email, ct),
        "InquiryReceived" =>
            SendInquiryReceivedAsync(Guid.Parse(msg.Payload), db, email, emailOptions, ct),
        "InquiryConfirmation" =>
            SendInquiryConfirmationAsync(
                JsonSerializer.Deserialize<EmailOutboxHelper.InquiryConfirmationPayload>(msg.Payload)!,
                db, email, ct),
        "PasswordReset" =>
            SendPasswordResetAsync(
                JsonSerializer.Deserialize<EmailOutboxHelper.PasswordResetPayload>(msg.Payload)!,
                email, ct),
        _ => throw new InvalidOperationException($"Unknown outbox event type: {msg.EventType}"),
    };

    private static async Task SendReturnCreatedAsync(
        Guid returnRequestId, AppDbContext db, IEmailSender email, CancellationToken ct)
    {
        var returnRequest = await db.ReturnRequests
            .AsNoTracking()
            .Include(r => r.BuyerUser)
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.Id == returnRequestId, ct);

        if (returnRequest is null || returnRequest.BuyerUser is null
            || string.IsNullOrWhiteSpace(returnRequest.BuyerUser.Email))
            return;

        var language = NotificationLanguage.Normalize(returnRequest.BuyerUser.Language);
        await email.SendAsync(OrderEmailMessages.ReturnCreated(returnRequest, language));
    }

    private static async Task SendOrderConfirmationAsync(
        Guid orderId, AppDbContext db, IEmailSender email, EmailOptions opts, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
            return;

        var language = NotificationLanguage.Normalize(order.BuyerUser.Language);
        await email.SendAsync(OrderEmailMessages.OrderConfirmation(order, language, opts.FrontendBaseUrl));
    }

    private static async Task SendPaymentReviewNeededAsync(
        Guid orderId, AppDbContext db, IEmailSender email, EmailOptions opts, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
            return;

        var language = NotificationLanguage.Normalize(order.BuyerUser.Language);
        await email.SendAsync(OrderEmailMessages.PaymentReviewNeeded(order, language, opts.FrontendBaseUrl));
    }

    private static async Task SendStatusChangedAsync(
        EmailOutboxHelper.StatusChangedPayload p, AppDbContext db, IEmailSender email, EmailOptions opts, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.BuyerUser)
            .FirstOrDefaultAsync(o => o.Id == p.OrderId, ct);

        if (order is null || order.BuyerUser is null || string.IsNullOrWhiteSpace(order.BuyerUser.Email))
            return;

        var language = NotificationLanguage.Normalize(order.BuyerUser.Language);
        await email.SendAsync(OrderEmailMessages.StatusChanged(order, p.Status, language, opts.FrontendBaseUrl));
    }

    private static async Task SendReturnStatusChangedAsync(
        EmailOutboxHelper.ReturnStatusChangedPayload p, AppDbContext db, IEmailSender email, CancellationToken ct)
    {
        var returnRequest = await db.ReturnRequests
            .AsNoTracking()
            .Include(r => r.BuyerUser)
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.Id == p.ReturnRequestId, ct);

        if (returnRequest is null || returnRequest.BuyerUser is null || string.IsNullOrWhiteSpace(returnRequest.BuyerUser.Email))
            return;

        var language = NotificationLanguage.Normalize(returnRequest.BuyerUser.Language);
        await email.SendAsync(OrderEmailMessages.ReturnStatusChanged(returnRequest, p.Status, language));
    }

    private static async Task SendInquiryReceivedAsync(
        Guid inquiryId, AppDbContext db, IEmailSender email, EmailOptions opts, CancellationToken ct)
    {
        var inquiry = await db.Inquiries
            .AsNoTracking()
            .Include(i => i.Product)
            .FirstOrDefaultAsync(i => i.Id == inquiryId, ct);

        if (inquiry is null) return;

        var adminEmail = opts.AdminNotificationEmail ?? opts.FromAddress;
        await email.SendAsync(OrderEmailMessages.InquiryReceived(inquiry, adminEmail));
    }

    private static async Task SendInquiryConfirmationAsync(
        EmailOutboxHelper.InquiryConfirmationPayload p, AppDbContext db, IEmailSender email, CancellationToken ct)
    {
        var inquiry = await db.Inquiries
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == p.InquiryId, ct);

        if (inquiry is null || string.IsNullOrWhiteSpace(inquiry.Email)) return;

        var language = NotificationLanguage.Normalize(p.Language);
        await email.SendAsync(OrderEmailMessages.InquiryConfirmation(inquiry, language));
    }

    private static Task SendPasswordResetAsync(
        EmailOutboxHelper.PasswordResetPayload p, IEmailSender email, CancellationToken ct)
    {
        var content = NotificationLanguage.Normalize(p.Language) == "ar"
            ? PasswordResetEmailMessages.ResetLinkArabic(p.ResetUrl)
            : PasswordResetEmailMessages.ResetLinkEnglish(p.ResetUrl);
        var message = new EmailMessage(
            To: p.ToEmail,
            Subject: content.Subject,
            TextBody: content.TextBody,
            HtmlBody: content.HtmlBody);
        return email.SendAsync(message, ct);
    }
}
