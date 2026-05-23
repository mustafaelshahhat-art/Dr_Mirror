namespace DrMirror.Api.Domain.Entities;

public sealed class AdminAuditLogEntry
{
    private AdminAuditLogEntry() { }

    public long Id { get; private set; }
    public Guid ActorUserId { get; private set; }
    public User? ActorUser { get; private set; }
    public string ActionType { get; private set; } = string.Empty;
    public string TargetEntityType { get; private set; } = string.Empty;
    public string TargetEntityId { get; private set; } = string.Empty;
    public string? PreviousStatus { get; private set; }
    public string? NewStatus { get; private set; }
    public string? Note { get; private set; }
    public string? CorrelationId { get; private set; }
    public DateTimeOffset TimestampUtc { get; private set; }

    public static AdminAuditLogEntry Create(
        Guid actorUserId,
        string actionType,
        string targetEntityType,
        string targetEntityId,
        string? previousStatus,
        string? newStatus,
        string? correlationId,
        DateTimeOffset timestampUtc,
        string? note = null)
    {
        return new AdminAuditLogEntry
        {
            ActorUserId = actorUserId,
            ActionType = actionType,
            TargetEntityType = targetEntityType,
            TargetEntityId = targetEntityId,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            CorrelationId = correlationId,
            TimestampUtc = timestampUtc.ToUniversalTime(),
        };
    }
}
