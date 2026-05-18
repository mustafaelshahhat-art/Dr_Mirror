using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
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

/// <summary>
/// Verifies Task 17 — complete inquiry lifecycle (Responded status, audit fields, pagination).
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class InquiryLifecycleTests : IClassFixture<InquiryLifecycleTests.Factory>
{
    private readonly Factory _factory;

    public InquiryLifecycleTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Marking_responded_sets_audit_fields()
    {
        var inquiryId = await _factory.SeedReadInquiryAsync();
        var adminId = await _factory.EnsureAdminAsync();
        var client = MakeAdminClient(adminId);

        var response = await client.PostAsync($"/api/admin/inquiries/{inquiryId}/respond", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.Equal("Responded", doc.RootElement.GetProperty("status").GetString());
        Assert.False(doc.RootElement.GetProperty("respondedAt").ValueKind == JsonValueKind.Null);
        Assert.NotNull(doc.RootElement.GetProperty("respondedByUserName").GetString());
    }

    [Fact]
    public async Task Already_responded_inquiry_returns_409()
    {
        var inquiryId = await _factory.SeedRespondedInquiryAsync();
        var adminId = await _factory.EnsureAdminAsync();
        var client = MakeAdminClient(adminId);

        var response = await client.PostAsync($"/api/admin/inquiries/{inquiryId}/respond", null);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task List_supports_responded_status_filter()
    {
        await _factory.SeedMixedInquiriesAsync();
        var adminId = await _factory.EnsureAdminAsync();
        var client = MakeAdminClient(adminId);

        var response = await client.GetAsync("/api/admin/inquiries?status=2&pageSize=100");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var items = doc.RootElement.GetProperty("items").EnumerateArray().ToList();

        Assert.NotEmpty(items);
        Assert.All(items, item =>
            Assert.Equal("Responded", item.GetProperty("status").GetString()));
    }

    [Fact]
    public async Task Inquiry_list_returns_paged_envelope()
    {
        await _factory.SeedMixedInquiriesAsync();
        var adminId = await _factory.EnsureAdminAsync();
        var client = MakeAdminClient(adminId);

        var response = await client.GetAsync("/api/admin/inquiries?pageSize=1");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("totalCount", out var tc));
        Assert.True(tc.GetInt32() >= 1);
        Assert.Equal(1, doc.RootElement.GetProperty("pageSize").GetInt32());
    }

    private HttpClient MakeAdminClient(Guid adminId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, InquiryAdminAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new InquiryAdminCaller(adminId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "InquiryLifecycleTest_" + Guid.NewGuid();
        private Guid? _adminId;

        public async Task<Guid> EnsureAdminAsync()
        {
            if (_adminId.HasValue) return _adminId.Value;

            using var scope = Services.CreateScope();
            var sp = scope.ServiceProvider;
            var userManager = sp.GetRequiredService<UserManager<User>>();
            var roleManager = sp.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            if (!await roleManager.RoleExistsAsync(UserRoles.Admin))
                await roleManager.CreateAsync(new IdentityRole<Guid>(UserRoles.Admin) { Id = Guid.NewGuid() });

            var admin = new User { Id = Guid.NewGuid(), FullName = "Test Admin", Email = "il-admin@example.com", UserName = "il-admin@example.com", EmailConfirmed = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
            await userManager.CreateAsync(admin, "TestPassword1!");
            await userManager.AddToRoleAsync(admin, UserRoles.Admin);
            _adminId = admin.Id;
            return admin.Id;
        }

        public async Task<Guid> SeedReadInquiryAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var inquiry = new Inquiry
            {
                Id = Guid.NewGuid(),
                FullName = "IL Tester",
                Email = "il-tester@example.com",
                Subject = "Read inquiry",
                Message = "Test message",
                Status = InquiryStatus.Read,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.Inquiries.Add(inquiry);
            await db.SaveChangesAsync();
            return inquiry.Id;
        }

        public async Task<Guid> SeedRespondedInquiryAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var inquiry = new Inquiry
            {
                Id = Guid.NewGuid(),
                FullName = "IL Responded",
                Email = "il-responded@example.com",
                Subject = "Already responded",
                Message = "Test message",
                Status = InquiryStatus.Responded,
                RespondedAt = DateTimeOffset.UtcNow.AddHours(-1),
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.Inquiries.Add(inquiry);
            await db.SaveChangesAsync();
            return inquiry.Id;
        }

        public async Task SeedMixedInquiriesAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            db.Inquiries.AddRange(
                new Inquiry { Id = Guid.NewGuid(), FullName = "New1", Email = "new1@example.com", Subject = "S", Message = "M", Status = InquiryStatus.New, CreatedAt = DateTimeOffset.UtcNow },
                new Inquiry { Id = Guid.NewGuid(), FullName = "Read1", Email = "read1@example.com", Subject = "S", Message = "M", Status = InquiryStatus.Read, CreatedAt = DateTimeOffset.UtcNow },
                new Inquiry { Id = Guid.NewGuid(), FullName = "Resp1", Email = "resp1@example.com", Subject = "S", Message = "M", Status = InquiryStatus.Responded, RespondedAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow }
            );
            await db.SaveChangesAsync();
        }
    }
}

public class InquiryAdminCaller
{
    public Guid UserId { get; }
    public InquiryAdminCaller(Guid id) => UserId = id;
}

public class InquiryAdminAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly InquiryAdminCaller _caller;

    public InquiryAdminAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        InquiryAdminCaller caller)
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
        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")), "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
