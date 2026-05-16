using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Addresses;

/// <summary>
/// Verifies the application-layer "one default per user" invariant enforced by
/// ClearOtherDefaults() in AddressEndpoints.cs. The filtered unique DB index
/// (IX_BuyerAddresses_UserId_UniqueDefault) is the production concurrency guard;
/// it cannot be tested against an in-memory provider but is verified by running
/// migration M5 against a real SQL Server instance before promotion.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class AddressDefaultTests : IClassFixture<AddressDefaultTests.Factory>
{
    private readonly Factory _factory;

    private static readonly object BaseAddress = new
    {
        Label = "Home",
        RecipientName = "Test User",
        Phone = "01000000000",
        Governorate = "cairo",
        City = "Maadi",
        StreetAddress = "123 Test Street",
    };

    public AddressDefaultTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Creating_first_address_sets_it_as_default()
    {
        var userId = await _factory.CreateUserAsync("first@example.com");
        var client = MakeClient(userId);

        var response = await client.PostAsJsonAsync("/api/addresses", BaseAddress);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var dto = await response.Content.ReadFromJsonAsync<AddressDto>();
        Assert.NotNull(dto);
        Assert.True(dto.IsDefault, "First address must automatically become the default.");
    }

    [Fact]
    public async Task Creating_second_address_without_set_default_leaves_first_as_default()
    {
        var userId = await _factory.CreateUserAsync("second@example.com");
        var client = MakeClient(userId);

        // Create first address (auto-default).
        var first = await client.PostAsJsonAsync("/api/addresses", BaseAddress);
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var firstDto = await first.Content.ReadFromJsonAsync<AddressDto>();

        // Create second address without SetDefault.
        var second = await client.PostAsJsonAsync("/api/addresses", new
        {
            Label = "Work",
            RecipientName = "Test User",
            Phone = "01000000001",
            Governorate = "cairo",
            City = "Downtown",
            StreetAddress = "456 Office St",
            SetDefault = false,
        });
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
        var secondDto = await second.Content.ReadFromJsonAsync<AddressDto>();

        Assert.NotNull(firstDto);
        Assert.NotNull(secondDto);
        Assert.True(firstDto.IsDefault, "First address should still be the default.");
        Assert.False(secondDto.IsDefault, "Second address (no SetDefault) must not be default.");
    }

    [Fact]
    public async Task Set_default_clears_previous_default()
    {
        var userId = await _factory.CreateUserAsync("setdefault@example.com");
        var client = MakeClient(userId);

        var first = await (await client.PostAsJsonAsync("/api/addresses", BaseAddress))
            .Content.ReadFromJsonAsync<AddressDto>();

        var second = await (await client.PostAsJsonAsync("/api/addresses", new
        {
            Label = "Work",
            RecipientName = "Test User",
            Phone = "01000000002",
            Governorate = "cairo",
            City = "Heliopolis",
            StreetAddress = "789 Work Ave",
            SetDefault = false,
        })).Content.ReadFromJsonAsync<AddressDto>();

        Assert.NotNull(first);
        Assert.NotNull(second);

        // Promote second to default.
        var setResponse = await client.PostAsync($"/api/addresses/{second.Id}/set-default", null);
        Assert.Equal(HttpStatusCode.OK, setResponse.StatusCode);

        // List and verify only second is default.
        var list = await (await client.GetAsync("/api/addresses"))
            .Content.ReadFromJsonAsync<List<AddressDto>>();

        Assert.NotNull(list);
        Assert.Single(list, a => a.IsDefault);
        Assert.Equal(second.Id, list.Single(a => a.IsDefault).Id);
    }

    [Fact]
    public async Task Deleting_default_address_promotes_next_most_recent()
    {
        var userId = await _factory.CreateUserAsync("deletepromote@example.com");
        var client = MakeClient(userId);

        var first = await (await client.PostAsJsonAsync("/api/addresses", BaseAddress))
            .Content.ReadFromJsonAsync<AddressDto>();

        var second = await (await client.PostAsJsonAsync("/api/addresses", new
        {
            Label = "Backup",
            RecipientName = "Test User",
            Phone = "01000000003",
            Governorate = "cairo",
            City = "Nasr City",
            StreetAddress = "321 Backup Rd",
            SetDefault = false,
        })).Content.ReadFromJsonAsync<AddressDto>();

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.True(first.IsDefault);

        // Delete the default (first).
        var del = await client.DeleteAsync($"/api/addresses/{first.Id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        // Second should now be default.
        var list = await (await client.GetAsync("/api/addresses"))
            .Content.ReadFromJsonAsync<List<AddressDto>>();

        Assert.NotNull(list);
        var remaining = Assert.Single(list);
        Assert.True(remaining.IsDefault, "Remaining address must be promoted to default after deleting the default.");
    }

    private HttpClient MakeClient(Guid userId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, AddressTestAuthHandler>(
                     "TestAuth", _ => { });
                s.AddSingleton(new AddressTestCaller(userId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "AddressDefaultTest_" + Guid.NewGuid();

        public async Task<Guid> CreateUserAsync(string email)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var userId = Guid.NewGuid();
            db.Users.Add(new User
            {
                Id = userId,
                UserName = email,
                Email = email,
                FullName = "Test User",
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            return userId;
        }
    }

    // Lightweight DTO for deserializing address responses.
    private record AddressDto(Guid Id, bool IsDefault);
}

public class AddressTestCaller
{
    public Guid UserId { get; }
    public AddressTestCaller(Guid userId) => UserId = userId;
}

public class AddressTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AddressTestCaller _caller;

    public AddressTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AddressTestCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString()),
            new Claim(ClaimTypes.Role, UserRoles.Buyer),
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
