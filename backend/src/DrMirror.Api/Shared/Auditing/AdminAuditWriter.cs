using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;

namespace DrMirror.Api.Shared.Auditing;

public sealed class AdminAuditWriter : IAdminAuditWriter
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly TimeProvider _timeProvider;

    public AdminAuditWriter(
        AppDbContext db,
        IHttpContextAccessor httpContextAccessor,
        TimeProvider timeProvider)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
        _timeProvider = timeProvider;
    }

    public Task WriteAsync(
        string actionType,
        string targetEntityType,
        string targetEntityId,
        string? previousStatus,
        string? newStatus,
        CancellationToken cancellationToken)
    {
        var userId = _httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!Guid.TryParse(userId, out var actorUserId))
        {
            throw new InvalidOperationException("Cannot write admin audit entry without an authenticated actor.");
        }

        var correlationId = Activity.Current?.RootId
            ?? _httpContextAccessor.HttpContext?.TraceIdentifier;

        var entry = AdminAuditLogEntry.Create(
            actorUserId,
            actionType,
            targetEntityType,
            targetEntityId,
            previousStatus,
            newStatus,
            correlationId,
            _timeProvider.GetUtcNow());

        _db.AdminAuditLogEntries.Add(entry);
        return Task.CompletedTask;
    }
}
