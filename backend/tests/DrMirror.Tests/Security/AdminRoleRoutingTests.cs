using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security;

[Collection(IntegrationTestCollection.Name)]
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

    public class Factory : IntegrationWebAppFactory
    {
    }
}
