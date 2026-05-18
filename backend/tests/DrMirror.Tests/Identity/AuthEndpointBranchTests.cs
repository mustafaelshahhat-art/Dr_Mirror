using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Identity;

/// <summary>
/// T115 auth branch matrix:
/// Login: success, invalid password, locked, disabled.
/// Register: success, duplicate email, weak password.
/// Refresh: success here; reuse detection is covered by Security.RefreshReuse.RefreshReuseTests.
/// Logout: success, refresh-token invalidation, and cookie clear behavior.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class AuthEndpointBranchTests : IClassFixture<AuthEndpointBranchTests.Factory>
{
    private readonly Factory _factory;

    public AuthEndpointBranchTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Register_success_creates_buyer_and_sets_refresh_cookie()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/register", new
        {
            email = $"register-success-{Guid.NewGuid():N}@example.com",
            password = "Password123!",
            fullName = "Register Success",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Contains("drmirror_refresh=", Assert.Single(response.Headers.GetValues("Set-Cookie")));

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var roles = document.RootElement.GetProperty("user").GetProperty("roles")
            .EnumerateArray()
            .Select(role => role.GetString())
            .ToArray();
        Assert.Contains(UserRoles.Buyer, roles);
    }

    [Fact]
    public async Task Register_duplicate_email_returns_409()
    {
        var email = $"register-duplicate-{Guid.NewGuid():N}@example.com";
        await _factory.CreateUserAsync(email);

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Password123!",
            fullName = "Register Duplicate",
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_weak_password_returns_validation_problem()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/register", new
        {
            email = $"register-weak-{Guid.NewGuid():N}@example.com",
            password = "password",
            fullName = "Register Weak",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_success_returns_access_token_and_refresh_cookie()
    {
        var email = $"login-success-{Guid.NewGuid():N}@example.com";
        await _factory.CreateUserAsync(email);

        var response = await LoginAsync(email, "Password123!");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("drmirror_refresh=", Assert.Single(response.Headers.GetValues("Set-Cookie")));
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.False(string.IsNullOrWhiteSpace(document.RootElement.GetProperty("accessToken").GetString()));
    }

    [Fact]
    public async Task Login_invalid_password_returns_401()
    {
        var email = $"login-invalid-{Guid.NewGuid():N}@example.com";
        await _factory.CreateUserAsync(email);

        var response = await LoginAsync(email, "WrongPassword123!");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_locked_user_returns_423()
    {
        var email = $"login-locked-{Guid.NewGuid():N}@example.com";
        var user = await _factory.CreateUserAsync(email);
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var current = await userManager.FindByIdAsync(user.Id.ToString());
            Assert.NotNull(current);
            await userManager.SetLockoutEnabledAsync(current!, true);
            await userManager.SetLockoutEndDateAsync(current!, DateTimeOffset.UtcNow.AddMinutes(5));
        }

        var response = await LoginAsync(email, "Password123!");

        Assert.Equal((HttpStatusCode)423, response.StatusCode);
    }

    [Fact]
    public async Task Login_disabled_user_returns_403()
    {
        var email = $"login-disabled-{Guid.NewGuid():N}@example.com";
        var user = await _factory.CreateUserAsync(email);
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var current = await db.Users.FindAsync(user.Id);
            Assert.NotNull(current);
            current!.IsDisabled = true;
            await db.SaveChangesAsync();
        }

        var response = await LoginAsync(email, "Password123!");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_success_rotates_the_refresh_cookie()
    {
        var email = $"refresh-success-{Guid.NewGuid():N}@example.com";
        await _factory.CreateUserAsync(email);
        var login = await LoginAsync(email, "Password123!");
        var rawCookie = ExtractRefreshCookie(login);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Cookie", $"drmirror_refresh={rawCookie}");
        request.Headers.Add("Origin", IntegrationWebAppFactory.TestTrustedOrigin);
        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("drmirror_refresh=", Assert.Single(response.Headers.GetValues("Set-Cookie")));

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var oldHash = jwt.HashRefreshToken(rawCookie);
        var oldToken = await db.RefreshTokens.SingleAsync(token => token.TokenHash == oldHash);
        Assert.NotNull(oldToken.RevokedAt);
        Assert.NotNull(oldToken.ReplacedByTokenHash);
    }

    [Fact]
    public async Task Logout_revokes_refresh_token_and_clear_cookie_is_sent()
    {
        var email = $"logout-success-{Guid.NewGuid():N}@example.com";
        await _factory.CreateUserAsync(email);
        var login = await LoginAsync(email, "Password123!");
        var rawCookie = ExtractRefreshCookie(login);

        var logout = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        logout.Headers.Add("Cookie", $"drmirror_refresh={rawCookie}");
        var response = await _factory.CreateClient().SendAsync(logout);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains("expires=", Assert.Single(response.Headers.GetValues("Set-Cookie")), StringComparison.OrdinalIgnoreCase);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
            var hash = jwt.HashRefreshToken(rawCookie);
            var row = await db.RefreshTokens.SingleAsync(token => token.TokenHash == hash);
            Assert.NotNull(row.RevokedAt);
        }

        var refresh = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        refresh.Headers.Add("Cookie", $"drmirror_refresh={rawCookie}");
        refresh.Headers.Add("Origin", IntegrationWebAppFactory.TestTrustedOrigin);
        var refreshResponse = await _factory.CreateClient().SendAsync(refresh);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshResponse.StatusCode);
    }

    private Task<HttpResponseMessage> LoginAsync(string email, string password) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password });

    private static string ExtractRefreshCookie(HttpResponseMessage response)
    {
        var setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        const string prefix = "drmirror_refresh=";
        var start = setCookie.IndexOf(prefix, StringComparison.OrdinalIgnoreCase);
        Assert.True(start >= 0, setCookie);
        start += prefix.Length;
        var end = setCookie.IndexOf(';', start);
        return setCookie[start..end];
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "AuthEndpointBranchTests_" + Guid.NewGuid();

        public async Task<User> CreateUserAsync(string email)
        {
            await using var scope = Services.CreateAsyncScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

            if (!await roleManager.RoleExistsAsync(UserRoles.Buyer))
            {
                var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(UserRoles.Buyer));
                Assert.True(roleResult.Succeeded, string.Join("; ", roleResult.Errors.Select(e => e.Description)));
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                FullName = email,
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            var createResult = await userManager.CreateAsync(user, "Password123!");
            Assert.True(createResult.Succeeded, string.Join("; ", createResult.Errors.Select(e => e.Description)));
            var roleResult2 = await userManager.AddToRoleAsync(user, UserRoles.Buyer);
            Assert.True(roleResult2.Succeeded, string.Join("; ", roleResult2.Errors.Select(e => e.Description)));
            return user;
        }
    }
}
