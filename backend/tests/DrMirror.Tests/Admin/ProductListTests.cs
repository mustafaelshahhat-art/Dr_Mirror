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

namespace DrMirror.Tests.Admin;

/// <summary>
/// Verifies Task 16 — admin product list pagination and image metadata population.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class ProductListTests : IClassFixture<ProductListTests.Factory>
{
    private readonly Factory _factory;

    public ProductListTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Product_list_returns_paged_result_with_correct_totalCount()
    {
        await _factory.SeedProductsAsync(3);
        var client = MakeAdminClient();

        var response = await client.GetAsync("/api/admin/products?pageSize=2");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        Assert.True(doc.RootElement.TryGetProperty("totalCount", out var tc));
        Assert.True(tc.GetInt32() >= 3);
        Assert.Equal(2, doc.RootElement.GetProperty("pageSize").GetInt32());
        Assert.True(doc.RootElement.GetProperty("totalPages").GetInt32() >= 2);
    }

    [Fact]
    public async Task Image_metadata_is_populated_when_stored()
    {
        var productId = await _factory.SeedProductWithImageMetadataAsync();
        var client = MakeAdminClient();

        var response = await client.GetAsync($"/api/admin/products/{productId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var images = doc.RootElement.GetProperty("images").EnumerateArray().ToList();
        Assert.NotEmpty(images);
        var img = images[0];

        Assert.NotEqual(JsonValueKind.Null, img.GetProperty("fileKey").ValueKind);
        Assert.NotEqual(JsonValueKind.Null, img.GetProperty("contentType").ValueKind);
        Assert.NotEqual(JsonValueKind.Null, img.GetProperty("sizeBytes").ValueKind);

        Assert.Equal("product-images/test-file.jpg", img.GetProperty("fileKey").GetString());
        Assert.Equal("image/jpeg", img.GetProperty("contentType").GetString());
        Assert.Equal(1024, img.GetProperty("sizeBytes").GetInt64());
    }

    private HttpClient MakeAdminClient()
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, ProductListAdminAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new ProductListAdminCaller(Guid.NewGuid()));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "ProductListTest_" + Guid.NewGuid();
        private int _productCount;

        public async Task SeedProductsAsync(int count)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cat = new Category { Id = Guid.NewGuid(), NameEn = "PL Cat", NameAr = "PL Cat", Slug = $"pl-cat-{Guid.NewGuid()}", IsActive = true };
            db.Categories.Add(cat);

            for (var i = 0; i < count; i++)
            {
                _productCount++;
                db.Products.Add(new Product
                {
                    Id = Guid.NewGuid(),
                    CategoryId = cat.Id,
                    NameEn = $"PL Product {_productCount}",
                    NameAr = $"PL Product {_productCount}",
                    Slug = $"pl-product-{_productCount}-{Guid.NewGuid()}",
                    IsPublished = true,
                    Price = 100,
                });
            }
            await db.SaveChangesAsync();
        }

        public async Task<Guid> SeedProductWithImageMetadataAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cat = new Category { Id = Guid.NewGuid(), NameEn = "PL ImgCat", NameAr = "PL ImgCat", Slug = $"pl-img-cat-{Guid.NewGuid()}", IsActive = true };
            var product = new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = cat.Id,
                NameEn = "PL Image Product",
                NameAr = "PL Image Product",
                Slug = $"pl-img-product-{Guid.NewGuid()}",
                IsPublished = true,
                Price = 200,
            };
            var image = new ProductImage
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Url = "https://example.com/img.jpg",
                Alt = "Test image",
                DisplayOrder = 0,
                FileKey = "product-images/test-file.jpg",
                ContentType = "image/jpeg",
                SizeBytes = 1024,
            };

            db.Categories.Add(cat);
            db.Products.Add(product);
            db.ProductImages.Add(image);
            await db.SaveChangesAsync();
            return product.Id;
        }
    }
}

public class ProductListAdminCaller
{
    public Guid UserId { get; }
    public ProductListAdminCaller(Guid id) => UserId = id;
}

public class ProductListAdminAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly ProductListAdminCaller _caller;

    public ProductListAdminAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ProductListAdminCaller caller)
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
