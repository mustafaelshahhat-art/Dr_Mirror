using System.Net;
using DrMirror.Api.Infrastructure.Notifications;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Password-reset email content. Single-language (Arabic OR English) and rendered
/// through the shared <see cref="EmailLayout"/>. The brand always renders as
/// <see cref="Brand.Name"/> ("Dr.Mirror") and is never translated to Arabic.
/// </summary>
public static class PasswordResetEmailMessages
{
    public static (string Subject, string TextBody, string HtmlBody) ResetLinkArabic(string resetUrl)
    {
        var subject = $"إعادة تعيين كلمة المرور - {Brand.Name}";
        var textBody =
            "مرحباً،\n\n" +
            "تلقّينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.\n" +
            "اضغط على الرابط التالي لتعيين كلمة مرور جديدة:\n\n" +
            $"{resetUrl}\n\n" +
            "هذا الرابط صالح لمدة ساعة واحدة من وقت الإرسال.\n" +
            "إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة بأمان.\n\n" +
            $"فريق {Brand.Name}";

        var html = EmailLayout.Build(
            language: "ar",
            title: "إعادة تعيين كلمة المرور",
            paragraphs:
            [
                "مرحباً،",
                $"اضغط على الزر أدناه لتعيين كلمة مرور جديدة لحسابك في {Brand.Name}.",
                "إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.",
            ],
            button: new EmailLayout.Button("إعادة تعيين كلمة المرور", resetUrl),
            rawSummaryHtml: FallbackBlock(
                "ar",
                resetUrl,
                fallbackLabel: "إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:",
                expiry: "ينتهي هذا الرابط خلال ساعة واحدة."),
            signoff: $"فريق {Brand.Name}");

        return (subject, textBody, html);
    }

    public static (string Subject, string TextBody, string HtmlBody) ResetLinkEnglish(string resetUrl)
    {
        var subject = $"Reset your {Brand.Name} password";
        var textBody =
            "Hello,\n\n" +
            "We received a request to reset your password.\n" +
            "Click the link below to set a new password:\n\n" +
            $"{resetUrl}\n\n" +
            "This link is valid for one hour.\n" +
            "If you did not request a password reset, you can safely ignore this message.\n\n" +
            $"The {Brand.Name} Team";

        var html = EmailLayout.Build(
            language: "en",
            title: "Reset Your Password",
            paragraphs:
            [
                "Hi,",
                $"Tap the button below to reset your {Brand.Name} account password.",
                "If you did not request a new password, you can safely ignore this email.",
            ],
            button: new EmailLayout.Button("Reset Password", resetUrl),
            rawSummaryHtml: FallbackBlock(
                "en",
                resetUrl,
                fallbackLabel: "If that does not work, copy and paste the following link into your browser:",
                expiry: "This link expires in one hour."),
            signoff: $"The {Brand.Name} Team");

        return (subject, textBody, html);
    }

    /// <summary>
    /// Raw HTML block with the clickable fallback link and expiry note. The reset URL
    /// must remain a live anchor (not encoded as text), so this is built as raw HTML
    /// with the URL HTML-encoded only inside the attribute/text.
    /// </summary>
    private static string FallbackBlock(string language, string resetUrl, string fallbackLabel, string expiry)
    {
        var align = language == "ar" ? "right" : "left";
        var encodedUrl = WebUtility.HtmlEncode(resetUrl);
        return $"""
          <p style="margin:6px 0 8px;font-size:13px;line-height:1.6;color:#64726f;text-align:{align};">{WebUtility.HtmlEncode(fallbackLabel)}</p>
          <p style="margin:0 0 18px;font-size:13px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;text-align:{align};">
            <a href="{encodedUrl}" style="color:#0f766e;text-decoration:underline;">{encodedUrl}</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64726f;text-align:{align};">{WebUtility.HtmlEncode(expiry)}</p>
        """;
    }
}
