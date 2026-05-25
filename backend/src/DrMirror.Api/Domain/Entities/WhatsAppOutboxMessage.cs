namespace DrMirror.Api.Domain.Entities;

public enum WhatsAppMessagePriority
{
    High = 0,
    Normal = 1,
    Low = 2,
}

public class WhatsAppOutboxMessage
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public Guid BuyerUserId { get; set; }
    public string RecipientPhoneMasked { get; set; } = string.Empty;
    public WhatsAppMessagePriority Priority { get; set; } = WhatsAppMessagePriority.Normal;
    public WhatsAppOutboxStatus Status { get; set; } = WhatsAppOutboxStatus.Pending;
    public int Attempts { get; set; }
    public DateTimeOffset NextRetryAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastAttemptAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset? LockedAt { get; set; }
    public string? LockedBy { get; set; }
    public string? FailureReason { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
}
