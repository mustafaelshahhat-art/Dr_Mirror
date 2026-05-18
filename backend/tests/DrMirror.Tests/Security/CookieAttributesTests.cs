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

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Password123!",
        });

        Assert.True(response.StatusCode == HttpStatusCode.OK,
            $"Expected 200, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        var setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.Contains("drmirror_refresh=", setCookie);
        Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=none", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/auth", setCookie, StringComparison.OrdinalIgnoreCase);
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
