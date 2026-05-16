using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin;

/// <summary>
/// Verifies the N+1 fix and search filter introduced in Task 15.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class UserListTests : IClassFixture<UserListTests.Factory>
{
    private readonly Factory _factory;

    public UserListTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Roles_are_loaded_correctly_via_join()
    {
        await _factory.SeedUsersAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/users?pageSize=100");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var items = doc.RootElement.GetProperty("items");

        var adminUser = items.EnumerateArray()
            .FirstOrDefault(u => u.GetProperty("email").GetString() == "ul-admin@example.com");

        Assert.True(adminUser.ValueKind != JsonValueKind.Undefined, "Admin user not found in response");
        var roles = adminUser.GetProperty("roles").EnumerateArray().Select(r => r.GetString()).ToList();
        Assert.Contains(UserRoles.Admin, roles);

        var buyerUser = items.EnumerateArray()
            .FirstOrDefault(u => u.GetProperty("email").GetString() == "ul-buyer@example.com");
        Assert.True(buyerUser.ValueKind != JsonValueKind.Undefined, "Buyer user not found in response");
        var buyerRoles = buyerUser.GetProperty("roles").EnumerateArray().Select(r => r.GetString()).ToList();
        Assert.Contains(UserRoles.Buyer, buyerRoles);
    }

    [Fact]
    public async Task Search_filter_returns_matching_users()
    {
        await _factory.SeedUsersAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/users?q=ul-admin");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var items = doc.RootElement.GetProperty("items").EnumerateArray().ToList();

        Assert.All(items, u =>
        {
            var email = u.GetProperty("email").GetString() ?? "";
            Assert.Contains("ul-admin", email);
        });
    }

    [Fact]
    public async Task List_returns_paged_envelope_with_totalCount()
    {
        await _factory.SeedUsersAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/users?pageSize=1&page=1");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("totalCount", out var tc));
        Assert.True(tc.GetInt32() >= 1);
        Assert.True(doc.RootElement.TryGetProperty("totalPages", out _));
    }

    private HttpClient MakeAdminClient()
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, UserListAdminAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new UserListAdminCaller(Guid.NewGuid()));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "UserListTest_" + Guid.NewGuid();
        private bool _seeded;

        public async Task SeedUsersAsync()
        {
            if (_seeded) return;
            _seeded = true;

            using var scope = Services.CreateScope();
            var sp = scope.ServiceProvider;
            var userManager = sp.GetRequiredService<UserManager<User>>();
            var roleManager = sp.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            foreach (var role in new[] { UserRoles.Admin, UserRoles.Buyer })
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role) { Id = Guid.NewGuid() });
            }

            var adminUser = new User { Id = Guid.NewGuid(), FullName = "UL Admin", Email = "ul-admin@example.com", UserName = "ul-admin@example.com", EmailConfirmed = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
            await userManager.CreateAsync(adminUser, "TestPassword1!");
            await userManager.AddToRoleAsync(adminUser, UserRoles.Admin);

            var buyerUser = new User { Id = Guid.NewGuid(), FullName = "UL Buyer", Email = "ul-buyer@example.com", UserName = "ul-buyer@example.com", EmailConfirmed = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
            await userManager.CreateAsync(buyerUser, "TestPassword1!");
            await userManager.AddToRoleAsync(buyerUser, UserRoles.Buyer);
        }
    }
}

public class UserListAdminCaller
{
    public Guid UserId { get; }
    public UserListAdminCaller(Guid id) => UserId = id;
}

public class UserListAdminAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly UserListAdminCaller _caller;

    public UserListAdminAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        UserListAdminCaller caller)
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
        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")), "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
