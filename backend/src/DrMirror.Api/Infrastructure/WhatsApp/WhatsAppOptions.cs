namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppOptions
{
    public const string SectionName = "WhatsApp";

    public bool Enabled { get; set; } = false;
    public string? ServiceUrl { get; set; }
    public string? InternalApiKey { get; set; }
    public int TimeoutSeconds { get; set; } = 10;
    /// <summary>Maximum seconds to wait for a WhatsApp send to complete before marking the attempt Failed.</summary>
    public int SendTimeoutSeconds { get; set; } = 15;
    /// <summary>Milliseconds between outbox poll cycles.</summary>
    public int PollIntervalMs { get; set; } = 1000;
    /// <summary>Maximum number of messages to dispatch concurrently per batch.</summary>
    public int MaxSendConcurrency { get; set; } = 3;
    /// <summary>Maximum WhatsApp messages allowed per phone number per day. Messages beyond this are skipped.</summary>
    public int DailyLimitPerPhone { get; set; } = 10;
    public int MaxAttempts { get; set; } = 5;
    public TimeSpan MaxBackoff { get; set; } = TimeSpan.FromMinutes(30);
    public int RetentionDays { get; set; } = 90;
    public bool EnableRetentionPurge { get; set; } = true;
}
