using System.Net;
using System.Net.Http.Json;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace DrMirror.Tests.Security;

[Collection(IntegrationTestCollection.Name)]
public class CookieAttributesTests : IClassFixture<CookieAttributesTests.Factory>
{
    private readonly Factory _factory;

    public CookieAttributesTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Cross_site_refresh_cookie_uses_secure_httponly_samesite_none_and_auth_path()
    {
        var email = $"cookie-{Guid.NewGuid():N}@example.com";
        await _factory.CreateUserAsync(email);
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login");
        request.Headers.Add("Origin", "https://frontend.example.com");
        request.Content = JsonContent.Create(new { email, password = "Password123!" });
        var response = await client.SendAsync(request);

        Assert.True(response.StatusCode == HttpStatusCode.OK,
            $"Expected 200, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        var setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.Contains("drmirror_refresh=", setCookie);
        Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=none", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/auth", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_response_includes_cross_origin_CORP_and_cors_headers()
    {
        var email = $"corp-cors-{Guid.NewGuid():N}@example.com";
        await _factory.CreateUserAsync(email);
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login");
        request.Headers.Add("Origin", IntegrationWebAppFactory.TestTrustedOrigin);
        request.Content = JsonContent.Create(new { email, password = "Password123!" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertHeader(response, "Cross-Origin-Resource-Policy", "cross-origin");
        AssertHeader(response, "Access-Control-Allow-Origin", IntegrationWebAppFactory.TestTrustedOrigin);
        AssertHeader(response, "Access-Control-Allow-Credentials", "true");
    }

    [Fact]
    public async Task Refresh_response_includes_cross_origin_CORP_and_cors_headers()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Origin", IntegrationWebAppFactory.TestTrustedOrigin);

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        AssertHeader(response, "Cross-Origin-Resource-Policy", "cross-origin");
        AssertHeader(response, "Access-Control-Allow-Origin", IntegrationWebAppFactory.TestTrustedOrigin);
        AssertHeader(response, "Access-Control-Allow-Credentials", "true");
    }

    private static void AssertHeader(HttpResponseMessage response, string name, string expected)
    {
        var found = response.Headers.TryGetValues(name, out var values);
        Assert.True(found, $"Expected header '{name}' on response, but none found.");
        Assert.Equal(expected, values!.First());
    }

    public class Factory : IntegrationWebAppFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Auth:UseCrossSiteCookies"] = "true",
                });
            });
        }
    }
}
