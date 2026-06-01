using System.Globalization;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Notifications;
using DrMirror.Api.Shared.Localization;

namespace DrMirror.Api.Infrastructure.WhatsApp;

/// <summary>
/// Builds WhatsApp message bodies. Every message is <b>single-language</b>
/// (Arabic OR English, chosen by the customer's resolved language — never mixed),
/// short, and structured with intentional line breaks. The brand always renders as
/// <see cref="Brand.Name"/> ("Dr.Mirror") and is never translated.
///
/// The first line is always the brand, followed by a blank line, then the body.
/// </summary>
public static class WhatsAppMessageTemplates
{
    private static bool IsAr(string language) => NotificationLanguage.Normalize(language) == "ar";

    private static string Money(decimal amount, string currency) =>
        $"{amount.ToString("N2", CultureInfo.InvariantCulture)} {currency}";

    private static string Wrap(string body) => $"{Brand.Name}\n\n{body}";

    private static string Greeting(string language, string? name) =>
        IsAr(language)
            ? string.IsNullOrWhiteSpace(name) ? "مرحباً،" : $"مرحباً {name}،"
            : string.IsNullOrWhiteSpace(name) ? "Hello," : $"Hi {name},";

    // ── OTP ─────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Security-focused OTP message. Single-language, minimal, no order details.
    /// </summary>
    public static string OtpVerification(string language, string code, int minutes) =>
        IsAr(language)
            ? $"رمز التحقق من {Brand.Name}: {code}\n\nصالح لمدة {minutes} دقائق.\nلا تشارك هذا الرمز مع أي شخص."
            : $"Your {Brand.Name} verification code is: {code}\n\nValid for {minutes} minutes.\nDo not share this code with anyone.";

    // ── Order lifecycle ──────────────────────────────────────────────────────────

    public static string OrderConfirmation(string language, string orderNumber, string? name, decimal? total, string? currency)
    {
        var ar = IsAr(language);
        var totalLine = total is { } t && !string.IsNullOrWhiteSpace(currency)
            ? (ar ? $"\nالإجمالي: {Money(t, currency)}" : $"\nTotal: {Money(t, currency)}")
            : "";
        var body = ar
            ? $"{Greeting(language, name)}\nاستلمنا طلبك #{orderNumber}.{totalLine}\n\nسنبدأ بتجهيزه ونوافيك بالمستجدات."
            : $"{Greeting(language, name)}\nWe've received your order #{orderNumber}.{totalLine}\n\nWe'll start preparing it and keep you updated.";
        return Wrap(body);
    }

    public static string OrderStatusChanged(string language, string orderNumber, OrderStatus status, string? name)
    {
        var ar = IsAr(language);
        var line = status switch
        {
            OrderStatus.Confirmed => ar ? $"تم تأكيد طلبك #{orderNumber} وهو الآن قيد المعالجة." : $"Your order #{orderNumber} is confirmed and now being processed.",
            OrderStatus.Paid => ar ? $"تم تأكيد دفع طلبك #{orderNumber}." : $"Payment for your order #{orderNumber} is confirmed.",
            OrderStatus.Preparing => ar ? $"طلبك #{orderNumber} قيد التجهيز الآن." : $"Your order #{orderNumber} is being prepared.",
            OrderStatus.Shipped => ar ? $"تم شحن طلبك #{orderNumber} وهو في الطريق إليك." : $"Your order #{orderNumber} has shipped and is on its way.",
            OrderStatus.Delivered => ar ? $"تم تسليم طلبك #{orderNumber}. نتمنى أن ينال إعجابك!" : $"Your order #{orderNumber} was delivered. We hope you love it!",
            OrderStatus.Cancelled => ar ? $"تم إلغاء طلبك #{orderNumber}. للاستفسار تواصل معنا." : $"Your order #{orderNumber} has been cancelled. Contact us with any questions.",
            _ => ar ? $"تم تحديث حالة طلبك #{orderNumber}." : $"The status of your order #{orderNumber} was updated.",
        };
        return Wrap($"{Greeting(language, name)}\n{line}");
    }

    // ── Payment proof ──────────────────────────────────────────────────────────

    public static string PaymentProofReceived(string language, string orderNumber, string? name)
    {
        var ar = IsAr(language);
        var body = ar
            ? $"{Greeting(language, name)}\nاستلمنا إثبات الدفع لطلبك #{orderNumber}.\n\nسيراجعه فريقنا قريباً ونوافيك بالنتيجة."
            : $"{Greeting(language, name)}\nWe've received your payment proof for order #{orderNumber}.\n\nOur team will review it shortly and let you know.";
        return Wrap(body);
    }

    public static string PaymentProofApproved(string language, string orderNumber, string? name)
    {
        var ar = IsAr(language);
        var body = ar
            ? $"{Greeting(language, name)}\nتم قبول إثبات الدفع لطلبك #{orderNumber}.\n\nسنبدأ بتجهيز طلبك قريباً."
            : $"{Greeting(language, name)}\nYour payment proof for order #{orderNumber} was approved.\n\nWe'll start preparing your order shortly.";
        return Wrap(body);
    }

    public static string PaymentProofRejected(string language, string orderNumber, string? name)
    {
        var ar = IsAr(language);
        var body = ar
            ? $"{Greeting(language, name)}\nتعذّر تأكيد إثبات الدفع لطلبك #{orderNumber}.\n\nيرجى رفع صورة تحويل صحيحة من صفحة طلباتك."
            : $"{Greeting(language, name)}\nWe couldn't confirm the payment proof for order #{orderNumber}.\n\nPlease upload a valid transfer screenshot from your orders page.";
        return Wrap(body);
    }

    // ── Returns ──────────────────────────────────────────────────────────────────

    public static string ReturnCreated(string language, string returnRef, string? name)
    {
        var ar = IsAr(language);
        var body = ar
            ? $"{Greeting(language, name)}\nاستلمنا طلب الإرجاع #{returnRef}.\n\nسنراجعه ونوافيك بالرد قريباً."
            : $"{Greeting(language, name)}\nWe've received your return request #{returnRef}.\n\nWe'll review it and get back to you shortly.";
        return Wrap(body);
    }

    public static string ReturnStatusChanged(string language, string returnRef, ReturnStatus status, string? name)
    {
        var ar = IsAr(language);
        var line = status switch
        {
            ReturnStatus.Approved => ar ? $"تمت الموافقة على طلب الإرجاع #{returnRef}." : $"Your return request #{returnRef} was approved.",
            ReturnStatus.Rejected => ar ? $"نأسف، تم رفض طلب الإرجاع #{returnRef}." : $"We're sorry, your return request #{returnRef} was rejected.",
            ReturnStatus.Received => ar ? $"تم استلام المنتج المُعاد للطلب #{returnRef} بنجاح." : $"We've received the returned item for #{returnRef}.",
            ReturnStatus.Completed => ar ? $"تم إتمام طلب الإرجاع #{returnRef} بالكامل." : $"Your return request #{returnRef} is now complete.",
            _ => ar ? $"تم تحديث طلب الإرجاع #{returnRef}." : $"Your return request #{returnRef} was updated.",
        };
        return Wrap($"{Greeting(language, name)}\n{line}");
    }
}
