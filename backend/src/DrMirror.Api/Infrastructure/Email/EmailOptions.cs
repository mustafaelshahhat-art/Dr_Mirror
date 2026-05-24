using System.ComponentModel.DataAnnotations;

namespace DrMirror.Api.Infrastructure.Email;

public sealed class EmailOptions : IValidatableObject
{
    public const string SectionName = "Email";

    private static readonly HashSet<string> KnownProviders =
        new(StringComparer.OrdinalIgnoreCase) { "logonly", "mailkit" };

    /// <summary><c>logonly</c> (default, dev) or <c>mailkit</c>.</summary>
    [Required]
    public string Provider { get; set; } = "logonly";

    /// <summary>Sender address printed on outbound messages.</summary>
    [Required]
    public string FromAddress { get; set; } = "no-reply@drmirror.local";

    /// <summary>Sender display name.</summary>
    public string FromName { get; set; } = "Dr. Mirror";

    /// <summary>Optional reply-to mailbox. Defaults to <see cref="FromAddress"/>.</summary>
    public string? ReplyToAddress { get; set; }

    /// <summary>
    /// Domain used for generated Message-ID headers. Defaults to the domain in <see cref="FromAddress"/>.
    /// </summary>
    public string? MessageIdDomain { get; set; }

    /// <summary>
    /// Where to send admin-directed notifications (new inquiries, etc.).
    /// Falls back to <see cref="FromAddress"/> when not set.
    /// </summary>
    public string? AdminNotificationEmail { get; set; }

    /// <summary>
    /// Frontend base URL used to build links in outbound emails (e.g. password reset).
    /// Required when <c>Provider == "mailkit"</c>.
    /// </summary>
    public string? FrontendBaseUrl { get; set; }

    // -- MailKit/SMTP-specific. --
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public bool SmtpUseStartTls { get; set; } = true;
    public string? SmtpUsername { get; set; }
    public string? SmtpPassword { get; set; }

    [Range(1, 100)]
    public int MaxAttempts { get; set; } = 7;

    public TimeSpan MaxBackoff { get; set; } = TimeSpan.FromDays(7);

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!KnownProviders.Contains(Provider))
        {
            yield return new ValidationResult(
                $"Unknown Email:Provider '{Provider}'. Valid values: logonly, mailkit.");
            yield break;
        }

        if (Provider.Equals("mailkit", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(SmtpHost) ||
                string.IsNullOrWhiteSpace(SmtpUsername) ||
                string.IsNullOrWhiteSpace(SmtpPassword))
            {
                yield return new ValidationResult(
                    "Email:Provider=mailkit requires SmtpHost, SmtpUsername, and SmtpPassword.");
            }

            if (string.IsNullOrWhiteSpace(FrontendBaseUrl))
            {
                yield return new ValidationResult(
                    "Email:Provider=mailkit requires FrontendBaseUrl (e.g. https://drmirror.shop).");
            }

            if (FromAddress.EndsWith(".local", StringComparison.OrdinalIgnoreCase))
            {
                yield return new ValidationResult(
                    "Email:Provider=mailkit requires a real FromAddress domain, not .local. Use a mailbox on an SPF/DKIM/DMARC-authenticated domain.");
            }
        }

        if (MaxBackoff <= TimeSpan.Zero)
        {
            yield return new ValidationResult("Email:MaxBackoff must be greater than zero.");
        }
    }
}
