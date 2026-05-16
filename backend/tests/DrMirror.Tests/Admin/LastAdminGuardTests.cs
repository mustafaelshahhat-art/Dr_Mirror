using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
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
public class LastAdminGuardTests : IClassFixture<LastAdminGuardTests.Factory>
{
    private readonly Factory _factory;

    public LastAdminGuardTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Remove_admin_from_last_admin_returns_409()
    {
        var soleAdminId = await _factory.CreateAdminUserAsync("sole@example.com", "Sole Admin");

        // Authenticate as a DIFFERENT user (has Admin claim but is not the sole admin).
        // This simulates a race where two admins tried to demote each other and one
        // already succeeded, leaving only soleAdminId in the Admin role.
        var callerId = Guid.NewGuid();
        var client = MakeClient(callerId);

        var response = await client.PatchAsJsonAsync(
            $"/api/admin/users/{soleAdminId}/roles",
            new { Roles = Array.Empty<string>() });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("last admin", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Remove_admin_from_one_of_two_admins_returns_200()
    {
        var admin1Id = await _factory.CreateAdminUserAsync("admin1@example.com", "Admin One");
        var admin2Id = await _factory.CreateAdminUserAsync("admin2@example.com", "Admin Two");

        // admin1 removes all roles from admin2 — still one admin left, so OK.
        // (Empty roles array avoids referencing the Buyer role which is not seeded in tests.)
        var client = MakeClient(admin1Id);
        var response = await client.PatchAsJsonAsync(
            $"/api/admin/users/{admin2Id}/roles",
            new { Roles = Array.Empty<string>() });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Self_demotion_guard_still_returns_409()
    {
        var adminId = await _factory.CreateAdminUserAsync("selfdemote@example.com", "Self Demote");

        // Admin tries to remove their own Admin role — self-demotion guard fires first.
        var client = MakeClient(adminId);
        var response = await client.PatchAsJsonAsync(
            $"/api/admin/users/{adminId}/roles",
            new { Roles = Array.Empty<string>() });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
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
        public override string DbName { get; } = "LastAdminGuardTest_" + Guid.NewGuid();

        public async Task<Guid> CreateAdminUserAsync(string email, string fullName)
        {
            using var scope = Services.CreateScope();
            var sp = scope.ServiceProvider;

            var userManager = sp.GetRequiredService<UserManager<DrMirror.Api.Domain.Entities.User>>();
            var roleManager = sp.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            // Ensure Admin role exists.
            if (!await roleManager.RoleExistsAsync(UserRoles.Admin))
                await roleManager.CreateAsync(new IdentityRole<Guid>(UserRoles.Admin) { Id = Guid.NewGuid() });

            var userId = Guid.NewGuid();
            var user = new DrMirror.Api.Domain.Entities.User
            {
                Id = userId,
                UserName = email,
                Email = email,
                FullName = fullName,
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };

            var createResult = await userManager.CreateAsync(user, "TestPassword1!");
            if (!createResult.Succeeded)
                throw new InvalidOperationException(
                    $"Failed to create user: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");

            await userManager.AddToRoleAsync(user, UserRoles.Admin);
            return userId;
        }
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
