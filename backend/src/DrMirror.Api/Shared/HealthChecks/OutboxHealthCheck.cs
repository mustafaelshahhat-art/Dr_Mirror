using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DrMirror.Api.Shared.HealthChecks;

public sealed class OutboxHealthCheck : IHealthCheck
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public OutboxHealthCheck(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var threshold = _configuration.GetValue("HealthChecks:OutboxStuckThreshold", 100);
        var cutoff = DateTimeOffset.UtcNow.AddHours(-1);
        var stuck = await _db.EmailOutboxMessages.CountAsync(
            m => m.Status != OutboxMessageStatus.Sent && m.CreatedAt < cutoff,
            cancellationToken);

        if (stuck > threshold)
            return HealthCheckResult.Unhealthy($"{stuck} outbox messages are stuck.");
        if (stuck > 0)
            return HealthCheckResult.Degraded($"{stuck} outbox messages are delayed.");
        return HealthCheckResult.Healthy();
    }
}
