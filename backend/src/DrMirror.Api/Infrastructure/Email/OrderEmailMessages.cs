using System.Globalization;
using System.Text;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Notifications;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Pure static factories that build <see cref="EmailMessage"/> values from already-loaded
/// domain objects. No I/O — kept separate so the outbox processor and any future caller
/// can share the same subject/body logic without duplicating it.
///
/// Every customer-facing message is single-language (Arabic OR English, chosen by the
/// customer's resolved <c>language</c>) and renders both a branded HTML body
/// (<see cref="EmailLayout"/>) and a plain-text fallback. The brand always renders as
/// <see cref="Brand.Name"/> ("Dr.Mirror") and is never translated.
/// </summary>
public static class OrderEmailMessages
{
    private static bool IsAr(string language) => language == "ar";

    private static string Money(decimal amount, string currency) =>
        $"{amount.ToString("N2", CultureInfo.InvariantCulture)} {currency}";

    private static string Signoff(string language) =>
        IsAr(language) ? $"فريق {Brand.Name}" : $"The {Brand.Name} Team";

    private static string OrderCtaLabel(string language) =>
        IsAr(language) ? "عرض الطلب" : "View your order";

    private static EmailLayout.Button? OrderButton(string language, string orderNumber, string? frontendBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(frontendBaseUrl)) return null;
        var url = $"{frontendBaseUrl.TrimEnd('/')}/account/orders/{Uri.EscapeDataString(orderNumber)}";
        return new EmailLayout.Button(OrderCtaLabel(language), url);
    }

    /// <summary>Assemble the plain-text fallback from the same parts the HTML uses.</summary>
    private static string ComposeText(IEnumerable<string> paragraphs, string? summaryText, string signoff)
    {
        var sb = new StringBuilder();
        sb.Append(string.Join("\n\n", paragraphs));
        if (!string.IsNullOrWhiteSpace(summaryText))
        {
            sb.Append("\n\n");
            sb.Append(summaryText);
        }
        sb.Append("\n\n— ");
        sb.Append(signoff);
        return sb.ToString();
    }

    // ── Order confirmation ────────────────────────────────────────────────────

    public static EmailMessage OrderConfirmation(Order order, string language, string? frontendBaseUrl = null)
    {
        var ar = IsAr(language);
        var name = order.BuyerUser!.FullName;
        var total = Money(order.Total, order.Currency);

        var (itemTuples, itemTextLines) = BuildItems(order.Items, order.Currency, language);

        string subject;
        List<string> paragraphs;
        if (order.PaymentMethodKind == PaymentMethodKind.Cod)
        {
            subject = ar ? $"تم تأكيد طلبك {order.OrderNumber}" : $"Order {order.OrderNumber} confirmed";
            paragraphs = ar
                ? [$"مرحباً {name}، تم تأكيد طلبك {order.OrderNumber}.",
                   $"ستدفع {total} نقداً للمندوب عند الاستلام."]
                : [$"Hi {name}, your order {order.OrderNumber} is confirmed.",
                   $"You will pay {total} in cash to the courier on delivery."];
        }
        else
        {
            subject = ar ? $"طلبك {order.OrderNumber} — بانتظار الدفع" : $"Order {order.OrderNumber} — awaiting payment";
            paragraphs = ar
                ? [$"مرحباً {name}، طلبك {order.OrderNumber} بانتظار الدفع ({total}).",
                   "حوّل المبلغ إلى الحساب الظاهر عند الدفع، ثم ارفع صورة التحويل من صفحة طلباتك."]
                : [$"Hi {name}, your order {order.OrderNumber} is awaiting payment ({total}).",
                   "Transfer the amount to the account shown at checkout, then upload the screenshot from your orders page."];
        }

        var title = ar ? "تأكيد الطلب" : "Order confirmed";
        var totalLabel = ar ? "الإجمالي" : "Total";
        var summaryHtml = EmailLayout.OrderSummary(language, itemTuples, totalLabel, total);
        var summaryText = $"{itemTextLines}\n{totalLabel}: {total}";

        var html = EmailLayout.Build(language, title, paragraphs,
            button: OrderButton(language, order.OrderNumber, frontendBaseUrl),
            rawSummaryHtml: summaryHtml,
            signoff: Signoff(language));
        var text = ComposeText(paragraphs, summaryText, Signoff(language));

        return new EmailMessage(order.BuyerUser!.Email!, subject, text, html);
    }

    // ── Payment proof received (awaiting review) ───────────────────────────────

    public static EmailMessage PaymentReviewNeeded(Order order, string language, string? frontendBaseUrl = null)
    {
        var ar = IsAr(language);
        var name = order.BuyerUser!.FullName;

        var subject = ar
            ? $"طلبك {order.OrderNumber} — استلمنا إثبات الدفع"
            : $"Order {order.OrderNumber} — payment proof received";
        var title = ar ? "استلمنا إثبات الدفع" : "Payment proof received";
        List<string> paragraphs = ar
            ? [$"مرحباً {name}، استلمنا إثبات الدفع لطلبك {order.OrderNumber}.",
               "سيراجعه فريقنا عادةً خلال يوم عمل، وسنرسل لك رسالة بمجرد تأكيده."]
            : [$"Hi {name}, we received your payment proof for order {order.OrderNumber}.",
               "Our team usually reviews it within a business day, and you'll get another email the moment it's confirmed."];

        var html = EmailLayout.Build(language, title, paragraphs,
            button: OrderButton(language, order.OrderNumber, frontendBaseUrl),
            signoff: Signoff(language));
        var text = ComposeText(paragraphs, null, Signoff(language));
        return new EmailMessage(order.BuyerUser!.Email!, subject, text, html);
    }

    // ── Order status changed ───────────────────────────────────────────────────

    public static EmailMessage StatusChanged(Order order, OrderStatus eventStatus, string language, string? frontendBaseUrl = null)
    {
        var ar = IsAr(language);
        var name = order.BuyerUser!.FullName;

        string subject;
        string title;
        List<string> paragraphs;

        switch (eventStatus)
        {
            case OrderStatus.Paid:
                subject = ar ? $"طلبك {order.OrderNumber} — تم تأكيد الدفع" : $"Order {order.OrderNumber} — payment confirmed";
                title = ar ? "تم تأكيد الدفع" : "Payment confirmed";
                paragraphs = ar
                    ? [$"مرحباً {name}، أكّدنا استلام دفعتك لطلب {order.OrderNumber}.", "سنبدأ بتجهيز طلبك قريباً."]
                    : [$"Hi {name}, we've confirmed your payment for order {order.OrderNumber}.", "We'll start preparing your order shortly."];
                break;
            case OrderStatus.Preparing:
                subject = ar ? $"طلبك {order.OrderNumber} — قيد التجهيز" : $"Order {order.OrderNumber} — preparing";
                title = ar ? "قيد التجهيز" : "Preparing your order";
                paragraphs = ar
                    ? [$"مرحباً {name}، نجهّز طلبك {order.OrderNumber} الآن.", "سنرسل لك رسالة عند خروجه للشحن."]
                    : [$"Hi {name}, we're packing order {order.OrderNumber} now.", "You'll get another email when it's on its way."];
                break;
            case OrderStatus.Shipped:
                subject = ar ? $"طلبك {order.OrderNumber} — تم الشحن" : $"Order {order.OrderNumber} — shipped";
                title = ar ? "تم شحن طلبك" : "Your order has shipped";
                paragraphs = ar
                    ? [$"مرحباً {name}، طلبك {order.OrderNumber} في الطريق إليك.", "يرجى إبقاء هاتفك متاحاً لمندوب الشحن."]
                    : [$"Hi {name}, order {order.OrderNumber} is on its way.", "Please keep your phone reachable for the courier."];
                break;
            case OrderStatus.Delivered:
                subject = ar ? $"طلبك {order.OrderNumber} — تم التسليم" : $"Order {order.OrderNumber} — delivered";
                title = ar ? "تم تسليم طلبك" : "Your order was delivered";
                paragraphs = ar
                    ? [$"مرحباً {name}، تم تسليم طلبك {order.OrderNumber}.", $"شكراً لتسوقك مع {Brand.Name}."]
                    : [$"Hi {name}, order {order.OrderNumber} was delivered.", $"Thank you for shopping with {Brand.Name}."];
                break;
            case OrderStatus.Cancelled:
                subject = ar ? $"طلبك {order.OrderNumber} — تم الإلغاء" : $"Order {order.OrderNumber} — cancelled";
                title = ar ? "تم إلغاء الطلب" : "Order cancelled";
                paragraphs = ar
                    ? [$"مرحباً {name}، تم إلغاء طلبك {order.OrderNumber}."]
                    : [$"Hi {name}, order {order.OrderNumber} has been cancelled."];
                if (!string.IsNullOrWhiteSpace(order.CancellationReason))
                    paragraphs.Add(ar ? $"السبب: {order.CancellationReason}" : $"Reason: {order.CancellationReason}");
                break;
            default:
                subject = ar ? $"طلبك {order.OrderNumber} — تحديث الحالة" : $"Order {order.OrderNumber} — status update";
                title = ar ? "تحديث حالة الطلب" : "Order status update";
                paragraphs = ar
                    ? [$"مرحباً {name}، تم تحديث حالة طلبك {order.OrderNumber}."]
                    : [$"Hi {name}, the status of order {order.OrderNumber} was updated."];
                break;
        }

        var html = EmailLayout.Build(language, title, paragraphs,
            button: OrderButton(language, order.OrderNumber, frontendBaseUrl),
            signoff: Signoff(language));
        var text = ComposeText(paragraphs, null, Signoff(language));
        return new EmailMessage(order.BuyerUser!.Email!, subject, text, html);
    }

    // ── Returns ────────────────────────────────────────────────────────────────

    public static EmailMessage ReturnCreated(ReturnRequest returnRequest, string language)
    {
        var ar = IsAr(language);
        var orderNumber = returnRequest.Order?.OrderNumber ?? returnRequest.OrderId.ToString();
        var name = returnRequest.BuyerUser!.FullName;

        var subject = ar
            ? $"طلب الإرجاع للطلب {orderNumber} — تم الاستلام"
            : $"Return request for order {orderNumber} — received";
        var title = ar ? "استلمنا طلب الإرجاع" : "Return request received";
        List<string> paragraphs = ar
            ? [$"مرحباً {name}، استلمنا طلب إرجاع الطلب {orderNumber}.", "سيراجعه فريقنا ويوافيك بالرد قريباً."]
            : [$"Hi {name}, we've received your return request for order {orderNumber}.", "Our team will review it and get back to you shortly."];

        var html = EmailLayout.Build(language, title, paragraphs, signoff: Signoff(language));
        var text = ComposeText(paragraphs, null, Signoff(language));
        return new EmailMessage(returnRequest.BuyerUser!.Email!, subject, text, html);
    }

    public static EmailMessage ReturnStatusChanged(ReturnRequest returnRequest, ReturnStatus eventStatus, string language)
    {
        var ar = IsAr(language);
        var orderNumber = returnRequest.Order?.OrderNumber ?? returnRequest.OrderId.ToString();
        var name = returnRequest.BuyerUser!.FullName;

        string subject;
        string title;
        List<string> paragraphs;
        switch (eventStatus)
        {
            case ReturnStatus.Approved:
                subject = ar ? $"طلب الإرجاع للطلب {orderNumber} — تمت الموافقة" : $"Return for order {orderNumber} — approved";
                title = ar ? "تمت الموافقة على الإرجاع" : "Return approved";
                paragraphs = ar
                    ? [$"مرحباً {name}، تمت الموافقة على طلب إرجاع الطلب {orderNumber}.", "يرجى اتباع تعليمات الإرجاع التي سيرسلها فريقنا."]
                    : [$"Hi {name}, your return request for order {orderNumber} was approved.", "Please follow the return instructions from our team."];
                break;
            case ReturnStatus.Rejected:
                subject = ar ? $"طلب الإرجاع للطلب {orderNumber} — مرفوض" : $"Return for order {orderNumber} — rejected";
                title = ar ? "تم رفض الإرجاع" : "Return rejected";
                paragraphs = ar
                    ? [$"مرحباً {name}، نأسف، تم رفض طلب إرجاع الطلب {orderNumber}."]
                    : [$"Hi {name}, your return request for order {orderNumber} was rejected."];
                if (!string.IsNullOrWhiteSpace(returnRequest.AdminNote))
                    paragraphs.Add(ar ? $"السبب: {returnRequest.AdminNote}" : $"Reason: {returnRequest.AdminNote}");
                break;
            case ReturnStatus.Completed:
                subject = ar ? $"طلب الإرجاع للطلب {orderNumber} — مكتمل" : $"Return for order {orderNumber} — completed";
                title = ar ? "اكتمل الإرجاع" : "Return completed";
                paragraphs = ar
                    ? [$"مرحباً {name}، اكتمل طلب إرجاع الطلب {orderNumber}."]
                    : [$"Hi {name}, your return request for order {orderNumber} is complete."];
                break;
            default:
                subject = ar ? $"طلب الإرجاع للطلب {orderNumber} — تحديث" : $"Return for order {orderNumber} — status update";
                title = ar ? "تحديث طلب الإرجاع" : "Return status update";
                paragraphs = ar
                    ? [$"مرحباً {name}، تم تحديث حالة طلب إرجاع الطلب {orderNumber}."]
                    : [$"Hi {name}, the status of your return for order {orderNumber} was updated."];
                break;
        }

        var html = EmailLayout.Build(language, title, paragraphs, signoff: Signoff(language));
        var text = ComposeText(paragraphs, null, Signoff(language));
        return new EmailMessage(returnRequest.BuyerUser!.Email!, subject, text, html);
    }

    // ── Inquiry: customer confirmation (separate from the admin notification) ───

    public static EmailMessage InquiryConfirmation(Inquiry inquiry, string language)
    {
        var ar = IsAr(language);
        var name = inquiry.FullName;

        var subject = ar ? $"استلمنا رسالتك — {Brand.Name}" : $"We received your message — {Brand.Name}";
        var title = ar ? "شكراً لتواصلك معنا" : "Thanks for reaching out";
        List<string> paragraphs = ar
            ? [$"مرحباً {name}، استلمنا رسالتك بخصوص: {inquiry.Subject}.", "سيتواصل معك فريقنا في أقرب وقت."]
            : [$"Hi {name}, we've received your message about: {inquiry.Subject}.", "Our team will get back to you as soon as possible."];

        var html = EmailLayout.Build(language, title, paragraphs, signoff: Signoff(language));
        var text = ComposeText(paragraphs, null, Signoff(language));
        return new EmailMessage(inquiry.Email, subject, text, html);
    }

    // ── Inquiry: internal admin notification (always English/internal) ──────────

    public static EmailMessage InquiryReceived(Inquiry inquiry, string adminEmail)
    {
        var productLine = inquiry.Product is not null ? $"Product: {inquiry.Product.NameEn}\n" : "";

        var body =
            $"New inquiry received on {Brand.Name}.\n\n" +
            $"From: {inquiry.FullName} <{inquiry.Email}>" +
            (inquiry.Phone is not null ? $" | {inquiry.Phone}" : "") + "\n" +
            productLine +
            $"Subject: {inquiry.Subject}\n\n" +
            $"Message:\n{inquiry.Message}\n\n" +
            $"View in admin: /admin/inquiries\n" +
            $"— {Brand.Name} System";

        return new EmailMessage(
            To: adminEmail,
            Subject: $"[{Brand.Name}] New inquiry: {inquiry.Subject}",
            TextBody: body);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private static (List<(string, string, int, string)> Tuples, string TextLines) BuildItems(
        IEnumerable<OrderItem> items, string currency, string language)
    {
        var ar = IsAr(language);
        var tuples = new List<(string, string, int, string)>();
        var textSb = new StringBuilder();
        foreach (var i in items)
        {
            var itemName = ar && !string.IsNullOrWhiteSpace(i.NameAr) ? i.NameAr : i.NameEn;
            var color = ar && !string.IsNullOrWhiteSpace(i.ColorNameAr) ? i.ColorNameAr : i.ColorName;
            var variant = $"{i.Size} / {color}";
            var lineTotal = Money(i.LineTotal, currency);
            tuples.Add((itemName, variant, i.Quantity, lineTotal));
            textSb.Append($"  • {itemName} ({variant}) ×{i.Quantity} — {lineTotal}\n");
        }
        return (tuples, textSb.ToString().TrimEnd('\n'));
    }
}
