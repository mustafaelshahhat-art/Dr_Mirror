using System.ComponentModel.DataAnnotations;

namespace DrMirror.Api.Infrastructure.Email;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary><c>logonly</c> (default, dev) or <c>mailkit</c>.</summary>
    [Required]
    public string Provider { get; set; } = "logonly";

    /// <summary>Sender address printed on outbound messages.</summary>
    [Required]
    public string FromAddress { get; set; } = "no-reply@drmirror.local";

    /// <summary>Sender display name.</summary>
    public string FromName { get; set; } = "Dr. Mirror";

    // -- MailKit/SMTP-specific. --
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public bool SmtpUseStartTls { get; set; } = true;
    public string? SmtpUsername { get; set; }
    public string? SmtpPassword { get; set; }
}
