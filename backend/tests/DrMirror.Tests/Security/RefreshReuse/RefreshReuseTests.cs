using System.Net;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security.RefreshReuse;

[Collection(IntegrationTestCollection.Name)]
public class RefreshReuseTests : IClassFixture<RefreshReuseTests.Factory>
{
    private readonly Factory _factory;

    public RefreshReuseTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Reused_revoked_refresh_token_revokes_the_users_active_refresh_tokens()
    {
        var user = await _factory.CreateUserAsync("refresh-reuse@example.com");
        var reusedRaw = "reuse-old-" + Guid.NewGuid();
        var activeRaw = "reuse-active-" + Guid.NewGuid();
        await _factory.AddRefreshTokenAsync(user.Id, reusedRaw, revoked: true);
        await _factory.AddRefreshTokenAsync(user.Id, activeRaw);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Cookie", $"drmirror_refresh={reusedRaw}");

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tokens = await db.RefreshTokens.Where(t => t.UserId == user.Id).ToListAsync();
        Assert.All(tokens, token => Assert.NotNull(token.RevokedAt));
    }

    public class Factory : IntegrationWebAppFactory;
}
