namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppOptions
{
    public const string SectionName = "WhatsApp";

    public bool Enabled { get; set; } = false;
    public string? ServiceUrl { get; set; }
    public string? InternalApiKey { get; set; }
    public int TimeoutSeconds { get; set; } = 10;
    public int MaxAttempts { get; set; } = 5;
    public TimeSpan MaxBackoff { get; set; } = TimeSpan.FromMinutes(30);
    public int RetentionDays { get; set; } = 90;
    public bool EnableRetentionPurge { get; set; } = true;
}
