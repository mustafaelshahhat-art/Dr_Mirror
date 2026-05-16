using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security;

[Collection(IntegrationTestCollection.Name)]
public class AccessTokenValidationTests : IClassFixture<AccessTokenValidationTests.Factory>
{
    private readonly Factory _factory;

    public AccessTokenValidationTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Disabled_user_access_token_is_rejected()
    {
        var user = await CreateUserAsync("disabled@example.com", UserRoles.Buyer);
        var token = await IssueTokenAsync(user.Id, UserRoles.Buyer);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var current = await userManager.FindByIdAsync(user.Id.ToString());
            current!.IsDisabled = true;
            await userManager.UpdateAsync(current);
        }

        var response = await GetMeAsync(token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Security_stamp_change_invalidates_existing_access_token()
    {
        var user = await CreateUserAsync("stamp@example.com", UserRoles.Buyer);
        var token = await IssueTokenAsync(user.Id, UserRoles.Buyer);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var current = await userManager.FindByIdAsync(user.Id.ToString());
            await userManager.UpdateSecurityStampAsync(current!);
        }

        var response = await GetMeAsync(token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(UserRoles.Buyer)]
    [InlineData(UserRoles.Admin)]
    public async Task Valid_access_token_authenticates_user(string role)
    {
        var user = await CreateUserAsync($"{role.ToLowerInvariant()}@example.com", role);
        var token = await IssueTokenAsync(user.Id, role);

        var response = await GetMeAsync(token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(body);
        Assert.Equal(user.Id, body!.Id);
        Assert.Contains(role, body.Roles);
    }

    private async Task<User> CreateUserAsync(string email, string role)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        if (!await roleManager.RoleExistsAsync(role))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(role));
            Assert.True(roleResult.Succeeded, string.Join("; ", roleResult.Errors.Select(e => e.Description)));
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            FullName = email,
            EmailConfirmed = true,
        };

        var createResult = await userManager.CreateAsync(user, "Password123!");
        Assert.True(createResult.Succeeded, string.Join("; ", createResult.Errors.Select(e => e.Description)));

        var roleResult2 = await userManager.AddToRoleAsync(user, role);
        Assert.True(roleResult2.Succeeded, string.Join("; ", roleResult2.Errors.Select(e => e.Description)));

        return user;
    }

    private async Task<string> IssueTokenAsync(Guid userId, params string[] roles)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var user = await userManager.FindByIdAsync(userId.ToString());
        Assert.NotNull(user);
        return jwt.CreateAccessToken(user!, roles).Token;
    }

    private async Task<HttpResponseMessage> GetMeAsync(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await client.GetAsync("/api/auth/me");
    }

    public class Factory : IntegrationWebAppFactory
    {
    }
}
