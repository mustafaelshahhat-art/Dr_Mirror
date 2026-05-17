using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin;

[Collection(IntegrationTestCollection.Name)]
public class UserRoleManagementTests : IClassFixture<UserRoleManagementTests.Factory>
{
    private readonly Factory _factory;

    public UserRoleManagementTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Admin_can_update_supported_user_roles()
    {
        var target = await _factory.CreateUserAsync("role-target@example.com", UserRoles.Buyer);
        var client = MakeClient(Guid.NewGuid());

        var response = await client.PutAsJsonAsync(
            $"/api/admin/users/{target.Id}/roles",
            new { Roles = new[] { UserRoles.Buyer, UserRoles.Vendor } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AdminUserResponse>();
        Assert.NotNull(body);
        Assert.Contains(UserRoles.Buyer, body.Roles);
        Assert.Contains(UserRoles.Vendor, body.Roles);
        Assert.DoesNotContain(UserRoles.Admin, body.Roles);
    }

    [Fact]
    public async Task Admin_cannot_remove_the_last_admin_role()
    {
        var target = await _factory.CreateUserAsync("last-admin@example.com", UserRoles.Admin);
        var client = MakeClient(Guid.NewGuid());

        var response = await client.PutAsJsonAsync(
            $"/api/admin/users/{target.Id}/roles",
            new { Roles = new[] { UserRoles.Buyer } });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("At least one admin account must remain active", body);
    }

    [Fact]
    public async Task Admin_cannot_assign_unsupported_roles()
    {
        var target = await _factory.CreateUserAsync("unsupported-role@example.com", UserRoles.Buyer);
        var client = MakeClient(Guid.NewGuid());

        var response = await client.PutAsJsonAsync(
            $"/api/admin/users/{target.Id}/roles",
            new { Roles = new[] { "Owner" } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private HttpClient MakeClient(Guid callerId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, AdminRoleTestAuthHandler>(
                     "TestAuth", _ => { });
                s.AddSingleton(new AdminRoleTestCaller(callerId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "UserRoleManagementTest_" + Guid.NewGuid();

        public async Task<User> CreateUserAsync(string email, params string[] roles)
        {
            using var scope = Services.CreateScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            foreach (var role in UserRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role) { Id = Guid.NewGuid() });
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = email.Split('@')[0],
                Email = email,
                UserName = email,
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            await userManager.CreateAsync(user, "TestPassword1!");
            foreach (var role in roles)
            {
                await userManager.AddToRoleAsync(user, role);
            }

            return user;
        }
    }

    private sealed record AdminUserResponse(string[] Roles);
}

public class AdminRoleTestCaller
{
    public Guid UserId { get; }
    public AdminRoleTestCaller(Guid userId) => UserId = userId;
}

public class AdminRoleTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AdminRoleTestCaller _caller;

    public AdminRoleTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AdminRoleTestCaller caller)
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
