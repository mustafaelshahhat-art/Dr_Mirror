using System.Text.RegularExpressions;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.WhatsApp;

namespace DrMirror.Tests.WhatsApp;

/// <summary>
/// Unit tests for <see cref="WhatsAppMessageTemplates"/>: brand consistency,
/// single-language rendering (no Arabic/English mixing), and OTP wording.
/// </summary>
public class WhatsAppMessageTemplatesTests
{
    private static bool HasArabic(string s) => Regex.IsMatch(s, "[؀-ۿ]");

    // ── OTP ──────────────────────────────────────────────────────────────────

    [Fact]
    public void Otp_english_matches_template_and_is_not_mixed()
    {
        var msg = WhatsAppMessageTemplates.OtpVerification("en", "123456", 10);
        Assert.Equal(
            "Your Dr.Mirror verification code is: 123456\n\nValid for 10 minutes.\nDo not share this code with anyone.",
            msg);
        Assert.False(HasArabic(msg)); // single-language: no Arabic leakage
    }

    [Fact]
    public void Otp_arabic_matches_template_and_keeps_latin_brand()
    {
        var msg = WhatsAppMessageTemplates.OtpVerification("ar", "123456", 10);
        Assert.Equal(
            "رمز التحقق من Dr.Mirror: 123456\n\nصالح لمدة 10 دقائق.\nلا تشارك هذا الرمز مع أي شخص.",
            msg);
        Assert.Contains("Dr.Mirror", msg);          // brand stays Latin
        Assert.DoesNotContain("verification", msg); // no English leakage
    }

    // ── Order lifecycle ──────────────────────────────────────────────────────

    [Fact]
    public void OrderConfirmation_starts_with_brand_and_has_order_number()
    {
        var msg = WhatsAppMessageTemplates.OrderConfirmation("en", "DM-2026-000001", "Sara", 500m, "EGP");
        Assert.StartsWith("Dr.Mirror", msg);
        Assert.Contains("#DM-2026-000001", msg);
        Assert.Contains("500.00 EGP", msg);
        Assert.Contains("Sara", msg);
    }

    [Fact]
    public void OrderStatusChanged_shipped_is_single_language_each()
    {
        var en = WhatsAppMessageTemplates.OrderStatusChanged("en", "DM-1", OrderStatus.Shipped, "Sara");
        var ar = WhatsAppMessageTemplates.OrderStatusChanged("ar", "DM-1", OrderStatus.Shipped, "سارة");
        Assert.False(HasArabic(en));
        Assert.Contains("shipped", en, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("شحن", ar);
        Assert.DoesNotContain("shipped", ar, StringComparison.OrdinalIgnoreCase);
    }

    // ── Payment proof ────────────────────────────────────────────────────────

    [Theory]
    [InlineData("en")]
    [InlineData("ar")]
    public void PaymentProof_messages_use_brand(string lang)
    {
        Assert.StartsWith("Dr.Mirror", WhatsAppMessageTemplates.PaymentProofReceived(lang, "DM-1", null));
        Assert.StartsWith("Dr.Mirror", WhatsAppMessageTemplates.PaymentProofApproved(lang, "DM-1", null));
        Assert.StartsWith("Dr.Mirror", WhatsAppMessageTemplates.PaymentProofRejected(lang, "DM-1", null));
    }
}
