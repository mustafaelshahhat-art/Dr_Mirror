using System.Net;
using DrMirror.Tests.Infrastructure;

namespace DrMirror.Tests.Security;

[Collection(IntegrationTestCollection.Name)]
public class ProductionHardeningTests : IClassFixture<ProductionHardeningTests.Factory>
{
    private readonly Factory _factory;

    public ProductionHardeningTests(Factory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/swagger")]
    [InlineData("/swagger/index.html")]
    [InlineData("/swagger/v1/swagger.json")]
    [InlineData("/swagger/v1/openapi.json")]
    public async Task Swagger_endpoints_return_404_in_non_Development(string path)
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_access_admin_whatsapp_status()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/admin/whatsapp/status");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_access_admin_whatsapp_qr()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/admin/whatsapp/qr");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_access_admin_whatsapp_attempts()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/admin/whatsapp/attempts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_access_admin_whatsapp_disconnect()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/admin/whatsapp/disconnect", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_access_admin_whatsapp_retry_all_failed()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/admin/whatsapp/attempts/retry-all-failed", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_access_notification_preferences()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/me/notification-preferences");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_cannot_access_cart()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/cart");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("GET", "/api/auth/me")]
    [InlineData("PUT", "/api/auth/me")]
    [InlineData("POST", "/api/checkout")]
    [InlineData("POST", "/api/auth/change-password")]
    [InlineData("POST", "/api/auth/phone/verify/send")]
    [InlineData("POST", "/api/auth/phone/verify")]
    [InlineData("POST", "/api/addresses")]
    [InlineData("GET", "/api/orders")]
    public async Task Protected_endpoints_return_401_for_anonymous(string method, string url)
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("GET", "/api/shipping/governorates")]
    [InlineData("GET", "/api/catalog/products")]
    [InlineData("GET", "/api/catalog/categories")]
    [InlineData("GET", "/api/app-config")]
    [InlineData("POST", "/api/auth/login")]
    [InlineData("POST", "/api/auth/register")]
    [InlineData("POST", "/api/auth/forgot-password")]
    [InlineData("POST", "/api/auth/reset-password")]
    [InlineData("POST", "/api/inquiries")]
    [InlineData("GET", "/api/health")]
    [InlineData("GET", "/api/health/live")]
    [InlineData("GET", "/api/health/ready")]
    public async Task Public_endpoints_are_accessible_anonymously(string method, string url)
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_endpoint_returns_403_without_trusted_origin()
    {
        // The refresh endpoint is anonymous but gated by RequireTrustedOriginMiddleware
        // which returns 403 when Origin header is missing or unknown.
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/auth/refresh", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Logout_endpoint_does_not_require_auth()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Production_error_response_does_not_expose_stack_trace()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/admin/orders/nonexistent");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("StackTrace", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(" at ", body, StringComparison.Ordinal);
    }

    public class Factory : IntegrationWebAppFactory
    {
    }
}
