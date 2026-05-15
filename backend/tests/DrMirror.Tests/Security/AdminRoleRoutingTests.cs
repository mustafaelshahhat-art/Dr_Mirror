using DrMirror.Api.Features.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using DrMirror.Api.Infrastructure.Persistence;

namespace DrMirror.Tests.Security;

public class AdminRoleRoutingTests : IClassFixture<AdminRoleRoutingTests.Factory>
{
    private readonly Factory _factory;

    public AdminRoleRoutingTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public void Every_admin_endpoint_requires_Admin_role()
    {
        var endpoints = GetEndpoints();

        var adminEndpoints = endpoints
            .Where(e => e.RoutePattern.RawText?.StartsWith("/api/admin/", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        if (adminEndpoints.Count == 0)
        {
            var allRoutes = endpoints
                .Select(e => e.RoutePattern.RawText ?? "(null)")
                .OrderBy(s => s);
            Assert.Fail(
                "No admin endpoints found. Registered routes:\n" +
                string.Join("\n", allRoutes));
        }

        foreach (var endpoint in adminEndpoints)
        {
            var authorizeData = endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>();
            Assert.NotEmpty(authorizeData);

            var hasAdminRole = authorizeData.Any(ad =>
                string.Equals(ad.Roles, "Admin", StringComparison.OrdinalIgnoreCase));

            Assert.True(hasAdminRole,
                $"Endpoint '{endpoint.RoutePattern.RawText}' does not require the Admin role. " +
                $"Found roles: {string.Join(", ", authorizeData.Select(a => a.Roles ?? "(none)"))}");
        }
    }

    [Fact]
    public void Non_admin_endpoints_do_not_require_Admin_role()
    {
        var endpoints = GetEndpoints();

        var nonAdminEndpoints = endpoints
            .Where(e => e.RoutePattern.RawText?.StartsWith("/api/admin/", StringComparison.OrdinalIgnoreCase) != true)
            .Where(e => e.RoutePattern.RawText?.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        foreach (var endpoint in nonAdminEndpoints)
        {
            var authorizeData = endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>();
            var hasAdminOnly = authorizeData.Any(ad =>
                string.Equals(ad.Roles, "Admin", StringComparison.OrdinalIgnoreCase));

            Assert.False(hasAdminOnly,
                $"Non-admin endpoint '{endpoint.RoutePattern.RawText}' unexpectedly requires the Admin role.");
        }
    }

    private IReadOnlyList<RouteEndpoint> GetEndpoints()
    {
        using var scope = _factory.Services.CreateScope();
        var dataSource = scope.ServiceProvider.GetRequiredService<EndpointDataSource>();
        return dataSource.Endpoints.OfType<RouteEndpoint>().ToList();
    }

    public class Factory : WebApplicationFactory<Program>
    {
        public Factory()
        {
            // Program.cs throws for these two values before builder.Build() is called,
            // so ConfigureWebHost/ConfigureServices hooks arrive too late to prevent it.
            // Setting them as process env vars ensures WebApplication.CreateBuilder(args)
            // picks them up at construction time. The DbContext is replaced below with
            // InMemory, so the dummy connection string is never actually opened.
            Environment.SetEnvironmentVariable("ConnectionStrings__Default",
                "Server=localhost;Database=DrMirrorTest;Trusted_Connection=True;TrustServerCertificate=True;");
            Environment.SetEnvironmentVariable("Jwt__Secret",
                "test-signing-secret-minimum-32-chars-long!!");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureServices(services =>
            {
                var dbDescriptor = services.FirstOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (dbDescriptor is not null) services.Remove(dbDescriptor);

                services.AddDbContext<AppDbContext>(opt =>
                    opt.UseInMemoryDatabase("AdminRoleRoutingTest"));
            });
        }
    }
}
