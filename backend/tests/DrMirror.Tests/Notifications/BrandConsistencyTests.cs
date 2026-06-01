using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Notifications;
using DrMirror.Api.Infrastructure.WhatsApp;

namespace DrMirror.Tests.Notifications;

/// <summary>
/// Guards the branding rule: every customer-facing message renders the brand
/// exactly as "Dr.Mirror" — never "Dr. Mirror" (with a space) and never the
/// Arabic translation "ميرور".
/// </summary>
public class BrandConsistencyTests
{
    private static Order MakeOrder() => new()
    {
        Id = Guid.NewGuid(),
        OrderNumber = "DM-2026-000001",
        BuyerUser = new User { FullName = "Sara", Email = "sara@example.com", UserName = "sara@example.com" },
        Total = 500m,
        Currency = "EGP",
        PaymentMethodKind = PaymentMethodKind.Cod,
        Status = OrderStatus.Delivered,
        Items = [new OrderItem { NameEn = "Shirt", NameAr = "قميص", Size = "M", ColorName = "Blue", ColorNameAr = "أزرق", Quantity = 1, LineTotal = 500m }],
    };

    public static IEnumerable<object[]> AllRenderedMessages()
    {
        foreach (var lang in new[] { "en", "ar" })
        {
            yield return [WhatsAppMessageTemplates.OtpVerification(lang, "123456", 10)];
            yield return [WhatsAppMessageTemplates.OrderConfirmation(lang, "DM-1", "Sara", 500m, "EGP")];
            yield return [WhatsAppMessageTemplates.OrderStatusChanged(lang, "DM-1", OrderStatus.Shipped, "Sara")];
            yield return [WhatsAppMessageTemplates.PaymentProofApproved(lang, "DM-1", "Sara")];
            yield return [WhatsAppMessageTemplates.ReturnCreated(lang, "ABC123", "Sara")];

            var conf = OrderEmailMessages.OrderConfirmation(MakeOrder(), lang);
            // Subjects are excluded: they legitimately omit the brand (e.g. "Order DM-… confirmed").
            yield return [conf.TextBody];
            yield return [conf.HtmlBody!];
        }

        var (_, arText, arHtml) = PasswordResetEmailMessages.ResetLinkArabic("https://drmirror.shop/reset");
        var (_, enText, enHtml) = PasswordResetEmailMessages.ResetLinkEnglish("https://drmirror.shop/reset");
        yield return [arText];
        yield return [arHtml];
        yield return [enText];
        yield return [enHtml];
    }

    [Theory]
    [MemberData(nameof(AllRenderedMessages))]
    public void Message_uses_canonical_brand_only(string rendered)
    {
        Assert.Equal("Dr.Mirror", Brand.Name);
        Assert.DoesNotContain("Dr. Mirror", rendered);        // no spaced variant
        Assert.DoesNotContain("ميرور", rendered);             // brand never translated
        Assert.Contains("Dr.Mirror", rendered);               // canonical brand present
    }
}
