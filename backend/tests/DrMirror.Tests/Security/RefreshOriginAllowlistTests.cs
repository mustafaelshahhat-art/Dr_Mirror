using System.Net;
using DrMirror.Tests.Infrastructure;

namespace DrMirror.Tests.Security;

/// <summary>
/// End-to-end coverage of the per-endpoint Origin allowlist gate on
/// <c>POST /api/auth/refresh</c>. The middleware runs before the rate-limiter
/// so a forged refresh never consumes a budget slot.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class RefreshOriginAllowlistTests : IClassFixture<RefreshOriginAllowlistTests.Factory>
{
    private readonly Factory _factory;

    public RefreshOriginAllowlistTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Allowlisted_origin_is_not_rejected_by_filter()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Origin", IntegrationWebAppFactory.TestTrustedOrigin);
        request.Headers.Add("Cookie", "drmirror_refresh=does-not-exist");

        var response = await _factory.CreateClient().SendAsync(request);

        // No matching token → 401, but crucially NOT 403 (which would mean the
        // Origin gate rejected before reaching the handler).
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_origin_is_rejected_with_403()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Origin", "https://evil.example.com");
        request.Headers.Add("Cookie", "drmirror_refresh=does-not-exist");

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Missing_origin_is_rejected_with_403()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Cookie", "drmirror_refresh=does-not-exist");
        // Deliberately no Origin header.

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Rejected_refresh_does_not_consume_rate_limit_budget()
    {
        var client = _factory.CreateClient();
        // Burst many forged refreshes — they all 403 and none touch the
        // rate-limit budget. After the burst, an allowlisted refresh still
        // gets past the gate (it 401s because there is no real session).
        for (var i = 0; i < 30; i++)
        {
            var forged = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
            forged.Headers.Add("Origin", "https://evil.example.com");
            forged.Headers.Add("Cookie", "drmirror_refresh=does-not-exist");
            var forgedResponse = await client.SendAsync(forged);
            Assert.Equal(HttpStatusCode.Forbidden, forgedResponse.StatusCode);
        }

        var trusted = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        trusted.Headers.Add("Origin", IntegrationWebAppFactory.TestTrustedOrigin);
        trusted.Headers.Add("Cookie", "drmirror_refresh=does-not-exist");
        var trustedResponse = await client.SendAsync(trusted);

        Assert.NotEqual((HttpStatusCode)429, trustedResponse.StatusCode);
    }

    public class Factory : IntegrationWebAppFactory;
}
