using System.Net;

namespace DrMirror.Api.Infrastructure.Email;

public static class PasswordResetEmailMessages
{
    public static (string Subject, string TextBody, string HtmlBody) ResetLinkArabic(string resetUrl)
    {
        var subject = "إعادة تعيين كلمة المرور - د. ميرور";
        var textBody =
            "مرحبًا،\n\n" +
            "تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك.\n" +
            "اضغط على الزر أو الرابط التالي لتعيين كلمة مرور جديدة:\n\n" +
            $"{resetUrl}\n\n" +
            "هذا الرابط صالح لمدة ساعة واحدة من تاريخ الإرسال.\n" +
            "إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.\n\n" +
            "فريق د. ميرور";
        return (subject, textBody, BuildHtml(
            resetUrl,
            lang: "ar",
            dir: "rtl",
            align: "right",
            title: "إعادة تعيين كلمة المرور",
            greeting: "مرحبًا،",
            intro: "اضغط على الزر أدناه لتعيين كلمة مرور جديدة لحسابك في د. ميرور.",
            safety: "إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.",
            button: "إعادة تعيين كلمة المرور",
            fallback: "إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:",
            expiry: "ينتهي هذا الرابط خلال ساعة واحدة.",
            signoff: "فريق د. ميرور"));
    }

    public static (string Subject, string TextBody, string HtmlBody) ResetLinkEnglish(string resetUrl)
    {
        var subject = "Reset your Dr. Mirror password";
        var textBody =
            "Hello,\n\n" +
            "We received a request to reset your password.\n" +
            "Click the button or link below to set a new password:\n\n" +
            $"{resetUrl}\n\n" +
            "This link is valid for one hour.\n" +
            "If you did not request a password reset, you can safely ignore this message.\n\n" +
            "The Dr. Mirror Team";
        return (subject, textBody, BuildHtml(
            resetUrl,
            lang: "en",
            dir: "ltr",
            align: "left",
            title: "Reset Your Password",
            greeting: "Hi,",
            intro: "Tap the button below to reset your Dr. Mirror account password.",
            safety: "If you did not request a new password, you can safely ignore this email.",
            button: "Reset Password",
            fallback: "If that does not work, copy and paste the following link into your browser:",
            expiry: "This link expires in one hour.",
            signoff: "The Dr. Mirror Team"));
    }

    private static string BuildHtml(
        string resetUrl,
        string lang,
        string dir,
        string align,
        string title,
        string greeting,
        string intro,
        string safety,
        string button,
        string fallback,
        string expiry,
        string signoff)
    {
        var encodedUrl = WebUtility.HtmlEncode(resetUrl);

        return $$"""
<!doctype html>
<html lang="{{lang}}" dir="{{dir}}">
<body style="margin:0;padding:0;background:#eef5f3;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f2a29;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{WebUtility.HtmlEncode(intro)}}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef5f3;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fbfefd;border:1px solid #d7e5e1;border-top:4px solid #0f766e;border-radius:16px;box-shadow:0 14px 38px rgba(15,118,110,0.10);overflow:hidden;">
          <tr>
            <td style="padding:32px 36px 30px;text-align:{{align}};">
              <p style="margin:0 0 20px;font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;">Dr. Mirror</p>
              <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:800;color:#17211f;">{{WebUtility.HtmlEncode(title)}}</h1>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#33413f;">{{WebUtility.HtmlEncode(greeting)}}</p>
              <p style="margin:0 0 6px;font-size:16px;line-height:1.7;color:#33413f;">{{WebUtility.HtmlEncode(intro)}}</p>
              <p style="margin:0 0 26px;font-size:15px;line-height:1.7;color:#566562;">{{WebUtility.HtmlEncode(safety)}}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 28px;">
                <tr>
                  <td align="center" bgcolor="#0f766e" style="border-radius:10px;">
                    <a href="{{encodedUrl}}" style="display:inline-block;min-width:190px;padding:14px 24px;border-radius:10px;background:#0f766e;color:#fbfefd;font-size:15px;font-weight:700;text-align:center;text-decoration:none;">{{WebUtility.HtmlEncode(button)}}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64726f;">{{WebUtility.HtmlEncode(fallback)}}</p>
              <p style="margin:0 0 22px;font-size:13px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;">
                <a href="{{encodedUrl}}" style="color:#0f766e;text-decoration:underline;">{{encodedUrl}}</a>
              </p>
              <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#64726f;">{{WebUtility.HtmlEncode(expiry)}}</p>
              <p style="margin:0;font-size:14px;line-height:1.7;font-weight:700;color:#33413f;">{{WebUtility.HtmlEncode(signoff)}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""";
    }
}
