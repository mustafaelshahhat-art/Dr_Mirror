using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Identity;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin;

[Collection(IntegrationTestCollection.Name)]
public class UserRoleManagementRemovedTests : IClassFixture<UserRoleManagementRemovedTests.Factory>
{
    private readonly Factory _factory;

    public UserRoleManagementRemovedTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Admin_users_can_be_listed_but_roles_cannot_be_updated()
    {
        var client = MakeClient(Guid.NewGuid());

        var listResponse = await client.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        var patchResponse = await client.PatchAsJsonAsync(
            $"/api/admin/users/{Guid.NewGuid()}/roles",
            new { Roles = Array.Empty<string>() });

        Assert.Equal(HttpStatusCode.NotFound, patchResponse.StatusCode);
    }

    private HttpClient MakeClient(Guid callerId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, AdminTestAuthHandler>(
                     "TestAuth", _ => { });
                s.AddSingleton(new AdminTestCaller(callerId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
    }
}

public class AdminTestCaller
{
    public Guid UserId { get; }
    public AdminTestCaller(Guid userId) => UserId = userId;
}

public class AdminTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AdminTestCaller _caller;

    public AdminTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AdminTestCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString()),
            new Claim(ClaimTypes.Role, UserRoles.Admin),
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
