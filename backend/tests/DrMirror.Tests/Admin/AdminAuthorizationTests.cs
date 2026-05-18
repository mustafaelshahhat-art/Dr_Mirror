using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin;

/// <summary>
/// Guards the Admin slice's authorization boundary:
///   • Anonymous callers → 401
///   • Authenticated buyers → 403
/// The Admin role itself is covered by <c>AdminRoleRoutingTests</c>.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class AdminAuthorizationTests : IClassFixture<AdminAuthorizationTests.Factory>
{
    private readonly Factory _factory;

    public AdminAuthorizationTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Anonymous_request_to_admin_endpoint_returns_401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/admin/orders");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Buyer_request_to_admin_endpoint_returns_403()
    {
        var buyerId = Guid.NewGuid();
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("BuyerAuth")
                 .AddScheme<AuthenticationSchemeOptions, BuyerAuthHandler>(
                     "BuyerAuth", _ => { });
                s.AddSingleton(new BuyerAuthCaller(buyerId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("BuyerAuth");

        var response = await client.GetAsync("/api/admin/orders");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    public class Factory : IntegrationWebAppFactory
    {
    }
}

public sealed class BuyerAuthCaller
{
    public Guid UserId { get; }
    public BuyerAuthCaller(Guid userId) => UserId = userId;
}

public sealed class BuyerAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly BuyerAuthCaller _caller;

    public BuyerAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        BuyerAuthCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString()),
            new Claim(ClaimTypes.Role, "Buyer"),
        };
        var identity = new ClaimsIdentity(claims, "BuyerAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "BuyerAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
