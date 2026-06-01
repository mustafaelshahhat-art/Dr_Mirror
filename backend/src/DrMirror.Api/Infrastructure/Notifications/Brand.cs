namespace DrMirror.Api.Infrastructure.Notifications;

/// <summary>
/// Canonical brand name. Must always render exactly as <c>Dr.Mirror</c> — no space,
/// never translated to Arabic. Single source of truth for every customer-facing
/// notification template (email + WhatsApp + OTP). Do not write the brand inline.
/// </summary>
public static class Brand
{
    public const string Name = "Dr.Mirror";
}
