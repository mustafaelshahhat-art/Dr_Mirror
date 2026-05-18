using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DrMirror.Api.Shared.HealthChecks;

public sealed class SqlServerHealthCheck : IHealthCheck
{
    private readonly AppDbContext _db;

    public SqlServerHealthCheck(AppDbContext db) => _db = db;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(2));

        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1", cts.Token);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("SQL Server check failed.", ex);
        }
    }
}
