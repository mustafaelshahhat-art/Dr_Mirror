using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security.RoleEscalation;

[Collection(IntegrationTestCollection.Name)]
public class ProfileEditEscalationTests : IClassFixture<ProfileEditEscalationTests.Factory>
{
    private readonly Factory _factory;

    public ProfileEditEscalationTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Profile_update_ignores_roles_disabled_and_email_fields()
    {
        var buyer = await _factory.CreateUserAsync("profile-escalation@example.com");
        var token = await _factory.IssueAccessTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PutAsJsonAsync("/api/auth/me", new
        {
            displayName = "Updated Buyer",
            phone = "+201000000000",
            preferredLocale = "en",
            roles = new[] { UserRoles.Admin },
            isDisabled = true,
            email = "attacker@example.com",
            emailConfirmed = false,
            id = Guid.NewGuid(),
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FindAsync(buyer.Id);
        Assert.NotNull(user);
        Assert.Equal("Updated Buyer", user!.FullName);
        Assert.Equal("+201000000000", user.PhoneNumber);
        Assert.Equal("profile-escalation@example.com", user.Email);
        Assert.True(user.EmailConfirmed);
        Assert.False(user.IsDisabled);
        Assert.Equal(buyer.Id, user.Id);
    }

    public class Factory : IntegrationWebAppFactory;
}
