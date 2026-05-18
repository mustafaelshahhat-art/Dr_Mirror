using System.Net;
using System.Net.Http.Json;
using DrMirror.Tests.Infrastructure;

namespace DrMirror.Tests.Security;

/// <summary>
/// Asserts the baseline security headers from the May 2026 audit hardening pass
/// are attached to every response shape — 200, 401, 404, and 429.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class SecurityHeadersTests : IClassFixture<SecurityHeadersTests.Factory>
{
    private readonly Factory _factory;

    public SecurityHeadersTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Headers_present_on_200_health_live()
    {
        var response = await _factory.CreateClient().GetAsync("/api/health/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        SecurityHeadersAssertions.AssertBaselineHeaders(response);
    }

    [Fact]
    public async Task Headers_present_on_404_unknown_route()
    {
        var response = await _factory.CreateClient().GetAsync("/api/does-not-exist");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        SecurityHeadersAssertions.AssertBaselineHeaders(response);
    }

    [Fact]
    public async Task Headers_present_on_401_unauthenticated_cart()
    {
        var response = await _factory.CreateClient().GetAsync("/api/cart");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        SecurityHeadersAssertions.AssertBaselineHeaders(response);
    }

    [Fact]
    public async Task Headers_present_on_429_rate_limited_login()
    {
        var client = _factory.CreateClient();
        HttpResponseMessage? last = null;
        // The login rate-limit policy is small enough that ~20 rapid POSTs
        // will trip it for this test client IP.
        for (var i = 0; i < 25; i++)
        {
            last = await client.PostAsJsonAsync("/api/auth/login", new
            {
                email = $"never-{Guid.NewGuid():N}@example.com",
                password = "WrongPassword123!",
            });
            if (last.StatusCode == (HttpStatusCode)429) break;
        }

        Assert.NotNull(last);
        Assert.Equal((HttpStatusCode)429, last!.StatusCode);
        SecurityHeadersAssertions.AssertBaselineHeaders(last);
    }

    public class Factory : IntegrationWebAppFactory;
}
