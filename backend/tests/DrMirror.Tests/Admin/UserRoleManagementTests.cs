using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin;

[Collection(IntegrationTestCollection.Name)]
public class UserRoleManagementTests : IClassFixture<UserRoleManagementTests.Factory>, IAsyncLifetime
{
    private readonly Factory _factory;

    public UserRoleManagementTests(Factory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureDeletedAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

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
    public async Task Admin_cannot_remove_last_admin_role_when_remaining_admin_is_disabled()
    {
        // Two admins; disable one, then try to strip Admin from the other.
        var target = await _factory.CreateUserAsync("target-disabled-scenario@example.com", UserRoles.Admin);
        var other = await _factory.CreateUserAsync("other-disabled-admin@example.com", UserRoles.Admin);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var adminUser = await db.Users.FindAsync(other.Id);
            adminUser!.IsDisabled = true;
            await db.SaveChangesAsync();
        }

        var client = MakeClient(Guid.NewGuid());
        var response = await client.PutAsJsonAsync(
            $"/api/admin/users/{target.Id}/roles",
            new { Roles = new[] { UserRoles.Buyer } });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("At least one admin account must remain active", body);
    }

    [Fact]
    public async Task Admin_can_remove_role_when_another_active_admin_exists_despite_disabled_admins()
    {
        // Three admins: one target, one other active, one disabled.
        // Removing Admin from target should succeed because the other active admin remains.
        var target = await _factory.CreateUserAsync("target-mixed@example.com", UserRoles.Admin);
        var activeOther = await _factory.CreateUserAsync("active-other@example.com", UserRoles.Admin);
        var disabledOther = await _factory.CreateUserAsync("disabled-other@example.com", UserRoles.Admin);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var adminUser = await db.Users.FindAsync(disabledOther.Id);
            adminUser!.IsDisabled = true;
            await db.SaveChangesAsync();
        }

        var client = MakeClient(Guid.NewGuid());
        var response = await client.PutAsJsonAsync(
            $"/api/admin/users/{target.Id}/roles",
            new { Roles = new[] { UserRoles.Buyer } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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

    [Fact]
    public async Task Admin_can_disable_user_and_security_stamp_is_rotated()
    {
        var actor = await _factory.CreateUserAsync("disable-actor@example.com", UserRoles.Admin);
        var target = await _factory.CreateUserAsync("disable-target@example.com", UserRoles.Buyer);
        var beforeStamp = target.SecurityStamp;
        var client = MakeClient(actor.Id);

        var response = await client.PostAsJsonAsync($"/api/admin/users/{target.Id}/disable", new { });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updated = await db.Users.FindAsync(target.Id);
        Assert.NotNull(updated);
        Assert.True(updated!.IsDisabled);
        Assert.NotEqual(beforeStamp, updated.SecurityStamp);
        Assert.Contains(db.AdminAuditLogEntries, entry =>
            entry.ActorUserId == actor.Id
            && entry.ActionType == "User.Disable"
            && entry.TargetEntityId == target.Id.ToString());
    }

    [Fact]
    public async Task Admin_can_enable_disabled_user_and_security_stamp_is_rotated()
    {
        var actor = await _factory.CreateUserAsync("enable-actor@example.com", UserRoles.Admin);
        var target = await _factory.CreateUserAsync("enable-target@example.com", UserRoles.Buyer);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FindAsync(target.Id);
            user!.IsDisabled = true;
            await db.SaveChangesAsync();
        }

        var client = MakeClient(actor.Id);
        var response = await client.PostAsJsonAsync($"/api/admin/users/{target.Id}/enable", new { });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updated = await verifyDb.Users.FindAsync(target.Id);
        Assert.NotNull(updated);
        Assert.False(updated!.IsDisabled);
        Assert.Contains(verifyDb.AdminAuditLogEntries, entry =>
            entry.ActorUserId == actor.Id
            && entry.ActionType == "User.Enable"
            && entry.TargetEntityId == target.Id.ToString());
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
            new Claim(JwtRegisteredClaimNames.Sub, _caller.UserId.ToString()),
            new Claim(ClaimTypes.Role, UserRoles.Admin),
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
