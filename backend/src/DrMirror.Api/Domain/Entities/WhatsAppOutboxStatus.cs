namespace DrMirror.Api.Domain.Entities;

public enum WhatsAppOutboxStatus
{
    Pending = 0,
    Processing = 1,
    Sent = 2,
    Failed = 3,
    Skipped = 4,
    Retrying = 5,
}
