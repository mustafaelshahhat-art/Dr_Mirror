using System.Net;
using System.Text;
using DrMirror.Api.Infrastructure.Notifications;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Shared, brand-consistent HTML shell for transactional emails. Every customer
/// email (order lifecycle, password reset, inquiry confirmation) renders through
/// this layout so branding, RTL/LTR handling, and styling stay identical.
///
/// Callers pass already-decoded text; this layout HTML-encodes everything except
/// the <see cref="Button"/> URL and any <c>rawSummaryHtml</c> block (which callers
/// are responsible for encoding). The brand wordmark always uses <see cref="Brand.Name"/>.
/// </summary>
public static class EmailLayout
{
    public sealed record Button(string Label, string Url);

    public static string Build(
        string language,
        string title,
        IReadOnlyList<string> paragraphs,
        Button? button = null,
        string? rawSummaryHtml = null,
        string? signoff = null,
        string? preheader = null)
    {
        var isAr = language == "ar";
        var dir = isAr ? "rtl" : "ltr";
        var align = isAr ? "right" : "left";

        var preheaderText = preheader ?? (paragraphs.Count > 0 ? paragraphs[0] : title);

        var paragraphsHtml = new StringBuilder();
        foreach (var p in paragraphs)
        {
            paragraphsHtml.Append(
                $"""<p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#33413f;">{WebUtility.HtmlEncode(p)}</p>""");
            paragraphsHtml.Append('\n');
        }

        var summaryHtml = string.IsNullOrWhiteSpace(rawSummaryHtml) ? "" : rawSummaryHtml;

        var buttonHtml = button is null
            ? ""
            : $$"""
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:6px auto 24px;">
                <tr>
                  <td align="center" bgcolor="#0f766e" style="border-radius:10px;">
                    <a href="{{WebUtility.HtmlEncode(button.Url)}}" style="display:inline-block;min-width:190px;padding:14px 24px;border-radius:10px;background:#0f766e;color:#fbfefd;font-size:15px;font-weight:700;text-align:center;text-decoration:none;">{{WebUtility.HtmlEncode(button.Label)}}</a>
                  </td>
                </tr>
              </table>
            """;

        var signoffHtml = string.IsNullOrWhiteSpace(signoff)
            ? ""
            : $"""<p style="margin:18px 0 0;font-size:14px;line-height:1.7;font-weight:700;color:#33413f;">{WebUtility.HtmlEncode(signoff)}</p>""";

        return $$"""
<!doctype html>
<html lang="{{language}}" dir="{{dir}}">
<body style="margin:0;padding:0;background:#eef5f3;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f2a29;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{WebUtility.HtmlEncode(preheaderText)}}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef5f3;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fbfefd;border:1px solid #d7e5e1;border-top:4px solid #0f766e;border-radius:16px;box-shadow:0 14px 38px rgba(15,118,110,0.10);overflow:hidden;">
          <tr>
            <td style="padding:32px 36px 30px;text-align:{{align}};">
              <p style="margin:0 0 20px;font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;">{{Brand.Name}}</p>
              <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:800;color:#17211f;">{{WebUtility.HtmlEncode(title)}}</h1>
              {{paragraphsHtml}}
              {{buttonHtml}}
              {{summaryHtml}}
              {{signoffHtml}}
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

    /// <summary>
    /// Builds an HTML-encoded order summary block (item lines + totals). Encoding
    /// happens here so callers can pass raw domain strings safely.
    /// </summary>
    public static string OrderSummary(
        string language,
        IEnumerable<(string Name, string Variant, int Quantity, string LineTotal)> items,
        string? totalLabel = null,
        string? totalValue = null)
    {
        var isAr = language == "ar";
        var align = isAr ? "right" : "left";

        var rows = new StringBuilder();
        foreach (var (name, variant, quantity, lineTotal) in items)
        {
            var label = WebUtility.HtmlEncode(name);
            if (!string.IsNullOrWhiteSpace(variant)) label += $" <span style=\"color:#7a8784;\">({WebUtility.HtmlEncode(variant)})</span>";
            rows.Append($"""
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#33413f;border-bottom:1px solid #eaf1ef;text-align:{align};">{label} ×{quantity}</td>
                <td style="padding:8px 0;font-size:14px;color:#33413f;border-bottom:1px solid #eaf1ef;text-align:{(isAr ? "left" : "right")};white-space:nowrap;">{WebUtility.HtmlEncode(lineTotal)}</td>
              </tr>
            """);
        }

        var totalRow = string.IsNullOrWhiteSpace(totalValue)
            ? ""
            : $"""
              <tr>
                <td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#17211f;text-align:{align};">{WebUtility.HtmlEncode(totalLabel ?? "")}</td>
                <td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#17211f;text-align:{(isAr ? "left" : "right")};white-space:nowrap;">{WebUtility.HtmlEncode(totalValue)}</td>
              </tr>
            """;

        return $"""
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 18px;border-collapse:collapse;">
            {rows}
            {totalRow}
          </table>
        """;
    }
}
