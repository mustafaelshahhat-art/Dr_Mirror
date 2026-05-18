using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Features.Admin.Audit;

public sealed record AdminAuditLogDto(
    long Id,
    Guid ActorUserId,
    string? ActorDisplayName,
    string ActionType,
    string TargetEntityType,
    string TargetEntityId,
    string? PreviousStatus,
    string? NewStatus,
    string? CorrelationId,
    DateTimeOffset TimestampUtc);

public static class AdminAuditLogMapping
{
    public static AdminAuditLogDto ToDto(this AdminAuditLogEntry entry) => new(
        Id: entry.Id,
        ActorUserId: entry.ActorUserId,
        ActorDisplayName: entry.ActorUser?.FullName,
        ActionType: entry.ActionType,
        TargetEntityType: entry.TargetEntityType,
        TargetEntityId: entry.TargetEntityId,
        PreviousStatus: entry.PreviousStatus,
        NewStatus: entry.NewStatus,
        CorrelationId: entry.CorrelationId,
        TimestampUtc: entry.TimestampUtc);
}
