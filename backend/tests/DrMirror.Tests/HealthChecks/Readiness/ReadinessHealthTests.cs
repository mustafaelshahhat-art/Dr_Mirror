using System.Net;
using DrMirror.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.HealthChecks.Readiness;

[Collection(IntegrationTestCollection.Name)]
public class ReadinessHealthTests : IClassFixture<ReadinessHealthTests.Factory>
{
    private readonly Factory _factory;

    public ReadinessHealthTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Readiness_returns_503_when_db_check_is_unhealthy()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Unhealthy", body, StringComparison.OrdinalIgnoreCase);
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<HealthCheckServiceOptions>(options =>
            {
                var sql = options.Registrations.FirstOrDefault(r => r.Name == "sqlserver");
                if (sql is not null)
                {
                    options.Registrations.Remove(sql);
                    options.Registrations.Add(new HealthCheckRegistration(
                        "sqlserver",
                        _ => new UnhealthyHealthCheck(),
                        HealthStatus.Unhealthy,
                        null));
                }
            });
        }

        private sealed class UnhealthyHealthCheck : IHealthCheck
        {
            public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct)
                => Task.FromResult(HealthCheckResult.Unhealthy("Simulated DB down"));
        }
    }
}
