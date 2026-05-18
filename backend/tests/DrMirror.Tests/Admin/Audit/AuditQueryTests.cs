using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin.Audit;

[Collection(IntegrationTestCollection.Name)]
public class AuditQueryTests : IClassFixture<AuditQueryTests.Factory>
{
    private readonly Factory _factory;

    public AuditQueryTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Returns_paginated_audit_entries()
    {
        var adminId = await _factory.EnsureAdminUserAsync();
        await _factory.SeedAuditEntriesAsync();
        var client = MakeAdminClient(adminId);

        var response = await client.GetAsync("/api/admin/audit?pageSize=2");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var items = doc.RootElement.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.True(doc.RootElement.GetProperty("totalCount").GetInt32() >= 2);
        Assert.Equal(1, doc.RootElement.GetProperty("page").GetInt32());
        Assert.Equal(2, doc.RootElement.GetProperty("pageSize").GetInt32());
        Assert.True(doc.RootElement.GetProperty("totalPages").GetInt32() >= 1);
    }

    [Fact]
    public async Task Can_filter_by_actionType()
    {
        var adminId = await _factory.EnsureAdminUserAsync();
        await _factory.SeedAuditEntriesAsync();
        var client = MakeAdminClient(adminId);

        var response = await client.GetAsync("/api/admin/audit?actionType=Order.StatusChange");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var items = doc.RootElement.GetProperty("items").EnumerateArray().ToList();
        Assert.NotEmpty(items);
        Assert.All(items, item =>
            Assert.Equal("Order.StatusChange", item.GetProperty("actionType").GetString()));
    }

    [Fact]
    public async Task Single_entry_by_id_returns_200()
    {
        var adminId = await _factory.EnsureAdminUserAsync();
        var entryId = await _factory.SeedSingleAuditEntryAsync(adminId);
        var client = MakeAdminClient(adminId);

        var response = await client.GetAsync($"/api/admin/audit/{entryId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.Equal(entryId, doc.RootElement.GetProperty("id").GetInt64());
        Assert.Equal(adminId.ToString(), doc.RootElement.GetProperty("actorUserId").GetString());
        Assert.Equal("Test Admin", doc.RootElement.GetProperty("actorDisplayName").GetString());
        Assert.Equal("User.Disable", doc.RootElement.GetProperty("actionType").GetString());
    }

    [Fact]
    public async Task Non_existent_id_returns_404()
    {
        var adminId = await _factory.EnsureAdminUserAsync();
        var client = MakeAdminClient(adminId);

        var response = await client.GetAsync("/api/admin/audit/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Buyer_cannot_access_audit_endpoints()
    {
        var client = MakeBuyerClient();

        var response = await client.GetAsync("/api/admin/audit");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private HttpClient MakeAdminClient(Guid adminId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, AuditAdminAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new AuditAdminCaller(adminId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    private HttpClient MakeBuyerClient()
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, AuditBuyerAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new AuditBuyerCaller());
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "AuditQueryTest_" + Guid.NewGuid();
        private Guid? _adminId;
        private bool _entriesSeeded;

        public async Task<Guid> EnsureAdminUserAsync()
        {
            if (_adminId.HasValue) return _adminId.Value;

            using var scope = Services.CreateScope();
            var sp = scope.ServiceProvider;
            var userManager = sp.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<User>>();
            var roleManager = sp.GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<Microsoft.AspNetCore.Identity.IdentityRole<Guid>>>();

            if (!await roleManager.RoleExistsAsync(UserRoles.Admin))
                await roleManager.CreateAsync(new Microsoft.AspNetCore.Identity.IdentityRole<Guid>(UserRoles.Admin) { Id = Guid.NewGuid() });

            var admin = new User { Id = Guid.NewGuid(), FullName = "Test Admin", Email = "aq-admin@example.com", UserName = "aq-admin@example.com", EmailConfirmed = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
            await userManager.CreateAsync(admin, "TestPassword1!");
            await userManager.AddToRoleAsync(admin, UserRoles.Admin);
            _adminId = admin.Id;
            return admin.Id;
        }

        public async Task SeedAuditEntriesAsync()
        {
            if (_entriesSeeded) return;
            _entriesSeeded = true;

            var adminId = await EnsureAdminUserAsync();
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            db.AdminAuditLogEntries.AddRange(
                AdminAuditLogEntry.Create(adminId, "Order.StatusChange", "Order", "1", "Pending", "Confirmed", null, DateTimeOffset.UtcNow.AddMinutes(-5)),
                AdminAuditLogEntry.Create(adminId, "Order.StatusChange", "Order", "2", "Confirmed", "Shipped", null, DateTimeOffset.UtcNow.AddMinutes(-4)),
                AdminAuditLogEntry.Create(adminId, "PaymentProof.Approve", "PaymentProof", "10", null, "Approved", null, DateTimeOffset.UtcNow.AddMinutes(-3)),
                AdminAuditLogEntry.Create(adminId, "PaymentProof.Reject", "PaymentProof", "11", null, "Rejected", null, DateTimeOffset.UtcNow.AddMinutes(-2)),
                AdminAuditLogEntry.Create(adminId, "User.Disable", "User", adminId.ToString(), "Enabled", "Disabled", null, DateTimeOffset.UtcNow.AddMinutes(-1))
            );
            await db.SaveChangesAsync();
        }

        public async Task<long> SeedSingleAuditEntryAsync(Guid adminId)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var entry = AdminAuditLogEntry.Create(adminId, "User.Disable", "User", adminId.ToString(), "Enabled", "Disabled", null, DateTimeOffset.UtcNow);
            db.AdminAuditLogEntries.Add(entry);
            await db.SaveChangesAsync();
            return entry.Id;
        }
    }
}

public class AuditAdminCaller
{
    public Guid UserId { get; }
    public AuditAdminCaller(Guid id) => UserId = id;
}

public class AuditAdminAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AuditAdminCaller _caller;

    public AuditAdminAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AuditAdminCaller caller)
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

public class AuditBuyerCaller
{
}

public class AuditBuyerAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AuditBuyerCaller _caller;

    public AuditBuyerAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AuditBuyerCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, UserRoles.Buyer),
        };
        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")), "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
