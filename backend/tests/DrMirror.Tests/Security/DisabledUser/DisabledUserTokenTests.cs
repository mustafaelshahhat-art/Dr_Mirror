using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security.DisabledUser;

[Collection(IntegrationTestCollection.Name)]
public class DisabledUserTokenTests : IClassFixture<DisabledUserTokenTests.Factory>
{
    private readonly Factory _factory;

    public DisabledUserTokenTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Disabling_user_invalidates_prior_access_token()
    {
        var user = await _factory.CreateUserAsync("disabled-mid-session@example.com");
        var token = await _factory.IssueAccessTokenAsync(user.Id, UserRoles.Buyer);

        await DisableUserAndBumpStampAsync(user.Id);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Disabled_user_refresh_attempt_is_rejected()
    {
        var user = await _factory.CreateUserAsync("disabled-refresh@example.com");
        var rawRefresh = "disabled-refresh-" + Guid.NewGuid();
        await _factory.AddRefreshTokenAsync(user.Id, rawRefresh);
        await DisableUserAndBumpStampAsync(user.Id);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Cookie", $"drmirror_refresh={rawRefresh}");

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task DisableUserAndBumpStampAsync(Guid userId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var user = await userManager.FindByIdAsync(userId.ToString());
        Assert.NotNull(user);
        user!.IsDisabled = true;
        var update = await userManager.UpdateAsync(user);
        Assert.True(update.Succeeded, string.Join("; ", update.Errors.Select(e => e.Description)));
        var stamp = await userManager.UpdateSecurityStampAsync(user);
        Assert.True(stamp.Succeeded, string.Join("; ", stamp.Errors.Select(e => e.Description)));
    }

    public class Factory : IntegrationWebAppFactory;
}
