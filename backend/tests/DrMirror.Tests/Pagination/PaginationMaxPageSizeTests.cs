using System.Net;
using System.Net.Http.Headers;
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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Pagination;

[Collection(IntegrationTestCollection.Name)]
public class PaginationMaxPageSizeTests : IClassFixture<PaginationMaxPageSizeTests.Factory>
{
    private readonly Factory _factory;

    public PaginationMaxPageSizeTests(Factory factory) => _factory = factory;

    [Fact]
    public async Task Admin_orders_list_pageSize_over_100_clamps_to_100()
    {
        await _factory.SeedOrderDataAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/orders?pageSize=200");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(100, doc.RootElement.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task Admin_products_list_pageSize_over_100_clamps_to_100()
    {
        await _factory.SeedProductDataAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/products?pageSize=200");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(100, doc.RootElement.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task Admin_users_list_pageSize_over_100_clamps_to_100()
    {
        await _factory.SeedUserDataAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/users?pageSize=200");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(100, doc.RootElement.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task Admin_inquiries_list_pageSize_over_100_clamps_to_100()
    {
        await _factory.SeedInquiryDataAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/inquiries?pageSize=200");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(100, doc.RootElement.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task Admin_audit_list_pageSize_over_100_clamps_to_100()
    {
        await _factory.SeedAuditDataAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/audit?pageSize=200");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal(100, doc.RootElement.GetProperty("pageSize").GetInt32());
    }

    private HttpClient MakeAdminClient()
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, PaginationAdminAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new PaginationAdminCaller(Guid.NewGuid()));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "PaginationMaxPageSize_" + Guid.NewGuid();
        private bool _orderSeeded;
        private bool _productSeeded;
        private bool _userSeeded;
        private bool _inquirySeeded;
        private bool _auditSeeded;

        public async Task SeedOrderDataAsync()
        {
            if (_orderSeeded) return;
            _orderSeeded = true;

            using var scope = Services.CreateScope();
            var sp = scope.ServiceProvider;
            var db = sp.GetRequiredService<AppDbContext>();
            var userManager = sp.GetRequiredService<UserManager<User>>();

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = "PG Order Tester",
                Email = "pg-order@example.com",
                UserName = "pg-order@example.com",
                EmailConfirmed = true,
            };
            await userManager.CreateAsync(user, "TestPassword1!");

            var pm = new PaymentMethod
            {
                Id = Guid.NewGuid(),
                Code = "PG-TEST",
                NameEn = "PG Test",
                NameAr = "PG Test",
                Kind = PaymentMethodKind.BankTransfer,
                IsActive = true,
            };
            db.PaymentMethods.Add(pm);

            db.Orders.Add(new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = "PG-ORD-001",
                BuyerUserId = user.Id,
                PaymentMethodId = pm.Id,
                PaymentMethodKind = PaymentMethodKind.BankTransfer,
                PaymentMethodNameEn = "PG Test",
                PaymentMethodNameAr = "PG Test",
                Currency = "EGP",
                SubTotal = 100m,
                ShippingFee = 10m,
                Total = 110m,
                Status = OrderStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        public async Task SeedProductDataAsync()
        {
            if (_productSeeded) return;
            _productSeeded = true;

            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cat = new Category
            {
                Id = Guid.NewGuid(),
                NameEn = "PG Cat",
                NameAr = "PG Cat",
                Slug = $"pg-cat-{Guid.NewGuid()}",
                IsActive = true,
            };
            db.Categories.Add(cat);
            db.Products.Add(new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = cat.Id,
                NameEn = "PG Product",
                NameAr = "PG Product",
                Slug = $"pg-prod-{Guid.NewGuid()}",
                Price = 100m,
            });
            await db.SaveChangesAsync();
        }

        public async Task SeedUserDataAsync()
        {
            if (_userSeeded) return;
            _userSeeded = true;

            using var scope = Services.CreateScope();
            var sp = scope.ServiceProvider;
            var userManager = sp.GetRequiredService<UserManager<User>>();

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = "PG User",
                Email = "pg-user@example.com",
                UserName = "pg-user@example.com",
                EmailConfirmed = true,
            };
            await userManager.CreateAsync(user, "TestPassword1!");
        }

        public async Task SeedInquiryDataAsync()
        {
            if (_inquirySeeded) return;
            _inquirySeeded = true;

            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            db.Inquiries.Add(new Inquiry
            {
                Id = Guid.NewGuid(),
                FullName = "PG Inquirer",
                Email = "pg-inq@example.com",
                Subject = "Test Subject",
                Message = "Test message content",
                Status = InquiryStatus.New,
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        public async Task SeedAuditDataAsync()
        {
            if (_auditSeeded) return;
            _auditSeeded = true;

            using var scope = Services.CreateScope();
            var sp = scope.ServiceProvider;
            var db = sp.GetRequiredService<AppDbContext>();
            var userManager = sp.GetRequiredService<UserManager<User>>();

            var admin = new User
            {
                Id = Guid.NewGuid(),
                FullName = "Audit Admin",
                Email = "pg-audit@example.com",
                UserName = "pg-audit@example.com",
                EmailConfirmed = true,
            };
            await userManager.CreateAsync(admin, "TestPassword1!");

            db.AdminAuditLogEntries.Add(
                AdminAuditLogEntry.Create(admin.Id, "Test.Action", "Test", "1", null, "Done", null, DateTimeOffset.UtcNow));
            await db.SaveChangesAsync();
        }
    }
}

public class PaginationAdminCaller
{
    public Guid UserId { get; }
    public PaginationAdminCaller(Guid id) => UserId = id;
}

public class PaginationAdminAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly PaginationAdminCaller _caller;

    public PaginationAdminAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        PaginationAdminCaller caller)
        : base(options, logger, encoder) => _caller = caller;

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
