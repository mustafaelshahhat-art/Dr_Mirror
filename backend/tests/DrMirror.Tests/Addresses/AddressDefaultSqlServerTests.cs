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
/// Runs the same "one default address per user" scenarios as
/// <see cref="AddressDefaultTests"/> but against a real SQL Server database.
/// This validates the filtered unique index <c>IX_BuyerAddresses_UserId_UniqueDefault</c>
/// that EF InMemory cannot enforce.
///
/// <para>Requires <c>DRMIRROR_TEST_SQL_CONNECTION</c> environment variable. Tests are
/// skipped when the variable is absent.</para>
/// </summary>
[Collection(SqlServerTestCollection.Name)]
public class AddressDefaultSqlServerTests : IClassFixture<AddressDefaultSqlServerTests.Factory>
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

    public AddressDefaultSqlServerTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Creating_first_address_sets_it_as_default()
    {
        if (!Factory.IsAvailable) return;

        var userId = await _factory.CreateUserAsync("sql-first@example.com");
        var client = MakeClient(userId);

        var response = await client.PostAsJsonAsync("/api/addresses", BaseAddress);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var dto = await response.Content.ReadFromJsonAsync<AddressDto>();
        Assert.NotNull(dto);
        Assert.True(dto.IsDefault, "First address must automatically become the default.");
    }

    [Fact]
    public async Task Set_default_clears_previous_default_via_SQL_Server_index()
    {
        if (!Factory.IsAvailable) return;

        var userId = await _factory.CreateUserAsync("sql-setdefault@example.com");
        var client = MakeClient(userId);

        var first = await (await client.PostAsJsonAsync("/api/addresses", BaseAddress))
            .Content.ReadFromJsonAsync<AddressDto>();

        var second = await (await client.PostAsJsonAsync("/api/addresses", new
        {
            Label = "Work",
            RecipientName = "Test User",
            Phone = "01000000001",
            Governorate = "cairo",
            City = "Downtown",
            StreetAddress = "456 Office St",
            SetDefault = false,
        })).Content.ReadFromJsonAsync<AddressDto>();

        Assert.NotNull(first);
        Assert.NotNull(second);

        var setResponse = await client.PostAsync($"/api/addresses/{second!.Id}/set-default", null);
        Assert.Equal(HttpStatusCode.OK, setResponse.StatusCode);

        var list = await (await client.GetAsync("/api/addresses"))
            .Content.ReadFromJsonAsync<List<AddressDto>>();

        Assert.NotNull(list);
        Assert.Single(list, a => a.IsDefault);
        Assert.Equal(second.Id, list!.Single(a => a.IsDefault).Id);
    }

    [Fact]
    public async Task Deleting_default_promotes_next_on_SQL_Server()
    {
        if (!Factory.IsAvailable) return;

        var userId = await _factory.CreateUserAsync("sql-deletepromote@example.com");
        var client = MakeClient(userId);

        var first = await (await client.PostAsJsonAsync("/api/addresses", BaseAddress))
            .Content.ReadFromJsonAsync<AddressDto>();

        var second = await (await client.PostAsJsonAsync("/api/addresses", new
        {
            Label = "Backup",
            RecipientName = "Test User",
            Phone = "01000000002",
            Governorate = "cairo",
            City = "Nasr City",
            StreetAddress = "321 Backup Rd",
            SetDefault = false,
        })).Content.ReadFromJsonAsync<AddressDto>();

        Assert.NotNull(first);
        Assert.NotNull(second);

        var del = await client.DeleteAsync($"/api/addresses/{first!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        var list = await (await client.GetAsync("/api/addresses"))
            .Content.ReadFromJsonAsync<List<AddressDto>>();

        Assert.NotNull(list);
        var remaining = Assert.Single(list);
        Assert.True(remaining.IsDefault);
    }

    private HttpClient MakeClient(Guid userId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, SqlAddressAuthHandler>(
                     "TestAuth", _ => { });
                s.AddSingleton(new SqlAddressCaller(userId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : SqlServerWebAppFactory
    {
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

    private record AddressDto(Guid Id, bool IsDefault);
}

public class SqlAddressCaller
{
    public Guid UserId { get; }
    public SqlAddressCaller(Guid userId) => UserId = userId;
}

public class SqlAddressAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly SqlAddressCaller _caller;

    public SqlAddressAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        SqlAddressCaller caller)
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
