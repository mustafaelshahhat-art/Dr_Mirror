namespace DrMirror.Api.Shared.Auditing;

public interface IAdminAuditWriter
{
    Task WriteAsync(
        string actionType,
        string targetEntityType,
        string targetEntityId,
        string? previousStatus,
        string? newStatus,
        CancellationToken cancellationToken);
}
