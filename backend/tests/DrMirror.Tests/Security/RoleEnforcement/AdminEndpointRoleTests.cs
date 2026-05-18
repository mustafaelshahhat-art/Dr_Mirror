using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;
using DrMirror.Api.Domain.Identity;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security.RoleEnforcement;

[Collection(IntegrationTestCollection.Name)]
public partial class AdminEndpointRoleTests : IClassFixture<AdminEndpointRoleTests.Factory>
{
    private readonly Factory _factory;

    public AdminEndpointRoleTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Buyer_jwt_receives_403_from_every_admin_endpoint()
    {
        var buyer = await _factory.CreateUserAsync("admin-endpoint-buyer@example.com");
        var token = await _factory.IssueAccessTokenAsync(buyer.Id, UserRoles.Buyer);
        var endpoints = GetAdminEndpoints();
        Assert.True(endpoints.Count >= 15, $"Expected broad admin endpoint coverage, found {endpoints.Count}.");

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        foreach (var endpoint in endpoints)
        {
            using var request = BuildRequest(endpoint);
            var response = await client.SendAsync(request);
            Assert.True(
                response.StatusCode == HttpStatusCode.Forbidden,
                $"Expected 403 for {request.Method} {request.RequestUri}, got {(int)response.StatusCode} {response.StatusCode}.");
        }
    }

    private IReadOnlyList<RouteEndpoint> GetAdminEndpoints()
    {
        using var scope = _factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<EndpointDataSource>()
            .Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText?.StartsWith("/api/admin/", StringComparison.OrdinalIgnoreCase) == true)
            .OrderBy(e => e.RoutePattern.RawText)
            .ToList();
    }

    private static HttpRequestMessage BuildRequest(RouteEndpoint endpoint)
    {
        var method = endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.FirstOrDefault() ?? "GET";
        var path = RouteParameterRegex().Replace(endpoint.RoutePattern.RawText!, match =>
        {
            var name = match.Groups[1].Value;
            var constraint = match.Groups[2].Value;

            if (constraint is ":long" or ":int")
                return "1";

            return name.Contains("id", StringComparison.OrdinalIgnoreCase)
                || constraint == ":guid"
                ? Guid.NewGuid().ToString()
                : "DM-TEST-001";
        });

        var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (method is "POST" or "PUT" or "PATCH")
        {
            request.Content = method == "POST" && path.EndsWith("/images", StringComparison.OrdinalIgnoreCase)
                ? new MultipartFormDataContent { { new ByteArrayContent([0x00]), "file", "image.jpg" } }
                : new StringContent("{}", Encoding.UTF8, "application/json");
        }

        return request;
    }

    [GeneratedRegex("\\{([^}:]+)(:[^}]+)?\\}")]
    private static partial Regex RouteParameterRegex();

    public class Factory : IntegrationWebAppFactory;
}
