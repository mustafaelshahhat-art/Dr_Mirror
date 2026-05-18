using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin;

/// <summary>
/// Covers the publish/unpublish idempotency contract from
/// <c>specs/006-audit-hardening/contracts/publish-unpublish-idempotency.md</c>:
/// no-op transitions return 200 with no audit row; real transitions write an
/// audit row whose PreviousValue is read from the loaded entity.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class AdminProductIdempotencyAuditTests : IClassFixture<AdminProductIdempotencyAuditTests.Factory>
{
    private readonly Factory _factory;

    public AdminProductIdempotencyAuditTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Publish_from_draft_writes_one_truthful_audit_row()
    {
        var actor = await _factory.CreateAdminAsync();
        var (productId, _) = await _factory.SeedDraftWithActiveVariantAsync();
        var client = MakeAdminClient(actor.Id);

        var publishResponse = await client.PostAsync($"/api/admin/products/{productId}/publish", content: null);
        Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);

        var rows = await _factory.GetAuditRowsAsync(productId);
        var publishRow = Assert.Single(rows, r => r.ActionType == "Product.Publish");
        Assert.Equal("Unpublished", publishRow.PreviousStatus);
        Assert.Equal("Published", publishRow.NewStatus);
        Assert.Equal(actor.Id, publishRow.ActorUserId);
    }

    [Fact]
    public async Task Publish_from_already_published_returns_200_with_no_new_audit_row()
    {
        var actor = await _factory.CreateAdminAsync();
        var (productId, _) = await _factory.SeedDraftWithActiveVariantAsync();
        var client = MakeAdminClient(actor.Id);

        var first = await client.PostAsync($"/api/admin/products/{productId}/publish", content: null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var rowsAfterFirst = await _factory.GetAuditRowsAsync(productId);
        Assert.Single(rowsAfterFirst, r => r.ActionType == "Product.Publish");

        var second = await client.PostAsync($"/api/admin/products/{productId}/publish", content: null);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var rowsAfterSecond = await _factory.GetAuditRowsAsync(productId);
        Assert.Single(rowsAfterSecond, r => r.ActionType == "Product.Publish");
    }

    [Fact]
    public async Task Unpublish_from_published_writes_one_truthful_audit_row()
    {
        var actor = await _factory.CreateAdminAsync();
        var (productId, _) = await _factory.SeedDraftWithActiveVariantAsync();
        var client = MakeAdminClient(actor.Id);

        await client.PostAsync($"/api/admin/products/{productId}/publish", content: null);

        var unpublish = await client.PostAsync($"/api/admin/products/{productId}/unpublish", content: null);
        Assert.Equal(HttpStatusCode.OK, unpublish.StatusCode);

        var rows = await _factory.GetAuditRowsAsync(productId);
        var unpublishRow = Assert.Single(rows, r => r.ActionType == "Product.Unpublish");
        Assert.Equal("Published", unpublishRow.PreviousStatus);
        Assert.Equal("Unpublished", unpublishRow.NewStatus);
    }

    [Fact]
    public async Task Unpublish_from_draft_returns_200_with_no_audit_row()
    {
        var actor = await _factory.CreateAdminAsync();
        var (productId, _) = await _factory.SeedDraftWithActiveVariantAsync();
        var client = MakeAdminClient(actor.Id);

        var response = await client.PostAsync($"/api/admin/products/{productId}/unpublish", content: null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var rows = await _factory.GetAuditRowsAsync(productId);
        Assert.DoesNotContain(rows, r => r.ActionType == "Product.Unpublish");
    }

    [Fact]
    public async Task Publish_unknown_product_returns_404()
    {
        var actor = await _factory.CreateAdminAsync();
        var client = MakeAdminClient(actor.Id);

        var response = await client.PostAsync($"/api/admin/products/{Guid.NewGuid()}/publish", content: null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Non_admin_publish_returns_403()
    {
        var actor = await _factory.CreateAdminAsync();
        var (productId, _) = await _factory.SeedDraftWithActiveVariantAsync();
        var client = MakeBuyerClient(actor.Id);

        var response = await client.PostAsync($"/api/admin/products/{productId}/publish", content: null);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private HttpClient MakeAdminClient(Guid actorId) => MakeClient(actorId, UserRoles.Admin);
    private HttpClient MakeBuyerClient(Guid actorId) => MakeClient(actorId, UserRoles.Buyer);

    private HttpClient MakeClient(Guid actorId, string role)
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddAuthentication("TestAuth")
                    .AddScheme<AuthenticationSchemeOptions, IdempotencyTestAuthHandler>("TestAuth", _ => { });
                services.AddSingleton(new IdempotencyTestCaller(actorId, role));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "AdminProductIdempotencyTests_" + Guid.NewGuid();

        public async Task<User> CreateAdminAsync()
        {
            await using var scope = Services.CreateAsyncScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            foreach (var knownRole in UserRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(knownRole))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid>(knownRole));
                }
            }
            var user = new User
            {
                Id = Guid.NewGuid(),
                UserName = $"idem-admin-{Guid.NewGuid():N}@example.com",
                Email = $"idem-admin-{Guid.NewGuid():N}@example.com",
                FullName = "Idempotency Admin",
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            await userManager.CreateAsync(user, "Password123!");
            await userManager.AddToRoleAsync(user, UserRoles.Admin);
            return user;
        }

        public async Task<(Guid ProductId, Guid VariantId)> SeedDraftWithActiveVariantAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var category = new Category
            {
                Id = Guid.NewGuid(),
                NameEn = "Idem Cat",
                NameAr = "فئة",
                Slug = $"idem-cat-{Guid.NewGuid()}",
                IsActive = true,
            };
            var product = new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                NameEn = "Idem Product",
                NameAr = "منتج",
                Slug = $"idem-prod-{Guid.NewGuid()}",
                Price = 100m,
                IsPublished = false,
            };
            var variant = new ProductVariant
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Size = "M",
                ColorName = "Black",
                ColorNameAr = "أسود",
                ColorHex = "#000000",
                Sku = $"IDEM-SKU-{Guid.NewGuid():N}"[..18],
                Stock = 10,
                IsActive = true,
            };
            db.Categories.Add(category);
            db.Products.Add(product);
            db.ProductVariants.Add(variant);
            await db.SaveChangesAsync();
            return (product.Id, variant.Id);
        }

        public async Task<List<AdminAuditLogEntry>> GetAuditRowsAsync(Guid productId)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var targetId = productId.ToString();
            return db.AdminAuditLogEntries
                .Where(e => e.TargetEntityType == "Product" && e.TargetEntityId == targetId)
                .ToList();
        }
    }
}

public sealed class IdempotencyTestCaller
{
    public Guid UserId { get; }
    public string Role { get; }
    public IdempotencyTestCaller(Guid userId, string role)
    {
        UserId = userId;
        Role = role;
    }
}

public sealed class IdempotencyTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IdempotencyTestCaller _caller;
    public IdempotencyTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IdempotencyTestCaller caller) : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Sub, _caller.UserId.ToString()),
            new Claim(ClaimTypes.Role, _caller.Role),
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
