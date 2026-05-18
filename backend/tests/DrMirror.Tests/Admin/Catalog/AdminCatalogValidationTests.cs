using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Features.Admin.Catalog.Categories;
using DrMirror.Api.Features.Admin.Catalog.Products;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin.Catalog;

[Collection(IntegrationTestCollection.Name)]
public class AdminCatalogValidationTests : IClassFixture<AdminCatalogValidationTests.Factory>
{
    private readonly Factory _factory;

    public AdminCatalogValidationTests(Factory factory) => _factory = factory;

    [Fact]
    public async Task Create_category_with_whitespace_name_returns_400()
    {
        var client = MakeAdminClient();
        var payload = new AdminCategoryUpsertRequest("فئة", "   ", 0);
        var response = await client.PostAsJsonAsync("/api/admin/categories", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_variant_with_duplicate_sku_returns_409()
    {
        var (productId, sku) = await _factory.SeedProductWithVariantAsync();
        var client = MakeAdminClient();
        var payload = new AdminVariantUpsertRequest("L", "Blue", "أزرق", "#0000FF", sku, 10);
        var response = await client.PostAsJsonAsync($"/api/admin/products/{productId}/variants", payload);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Create_product_with_negative_price_returns_400()
    {
        var catId = await _factory.SeedCategoryAsync();
        var client = MakeAdminClient();
        var payload = new AdminProductCreateRequest("Test", "Test", "desc", "desc", -1m, ProductGender.Unisex, null, null, null, catId);
        var response = await client.PostAsJsonAsync("/api/admin/products", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_variant_with_negative_stock_returns_400()
    {
        var productId = await _factory.SeedProductAsync();
        var client = MakeAdminClient();
        var payload = new AdminVariantUpsertRequest("M", "Red", "أحمر", "#FF0000", "NEG-SKU", -1);
        var response = await client.PostAsJsonAsync($"/api/admin/products/{productId}/variants", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_product_with_missing_category_returns_400()
    {
        var client = MakeAdminClient();
        var payload = new AdminProductCreateRequest("Test", "Test", "desc", "desc", 100m, ProductGender.Unisex, null, null, null, Guid.Empty);
        var response = await client.PostAsJsonAsync("/api/admin/products", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_image_exceeding_size_limit_returns_400()
    {
        var productId = await _factory.SeedProductAsync();
        var client = MakeAdminClient();
        var fileContent = new byte[200];
        var filePart = new ByteArrayContent(fileContent);
        filePart.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        using var form = new MultipartFormDataContent();
        form.Add(filePart, "file", "test.jpg");
        var response = await client.PostAsync($"/api/admin/products/{productId}/images", form);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_image_with_wrong_mime_type_returns_415()
    {
        var productId = await _factory.SeedProductAsync();
        var client = MakeAdminClient();
        var fileContent = new byte[] { 0xFF, 0xD8, 0xFF, 0x00 };
        var filePart = new ByteArrayContent(fileContent);
        filePart.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        using var form = new MultipartFormDataContent();
        form.Add(filePart, "file", "test.pdf");
        var response = await client.PostAsync($"/api/admin/products/{productId}/images", form);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Fact]
    public async Task Upload_image_with_content_mismatching_magic_bytes_returns_415()
    {
        var productId = await _factory.SeedProductAsync();
        var client = MakeAdminClient();
        var fileContent = new byte[20];
        var filePart = new ByteArrayContent(fileContent);
        filePart.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        using var form = new MultipartFormDataContent();
        form.Add(filePart, "file", "test.jpg");
        var response = await client.PostAsync($"/api/admin/products/{productId}/images", form);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    private HttpClient MakeAdminClient()
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, AdminCatalogAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new AdminCatalogCaller(Guid.NewGuid()));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "AdminCatalogValidationTest_" + Guid.NewGuid();

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<FileStorageOptions>(o => o.MaxFileSizeBytes = 100);
        }

        public async Task<Guid> SeedCategoryAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cat = new Category { Id = Guid.NewGuid(), NameEn = "ACV Cat", NameAr = "فئة", Slug = $"acv-cat-{Guid.NewGuid()}", IsActive = true };
            db.Categories.Add(cat);
            await db.SaveChangesAsync();
            return cat.Id;
        }

        public async Task<Guid> SeedProductAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cat = new Category { Id = Guid.NewGuid(), NameEn = "ACV ProdCat", NameAr = "فئة", Slug = $"acv-prod-cat-{Guid.NewGuid()}", IsActive = true };
            var product = new Product { Id = Guid.NewGuid(), CategoryId = cat.Id, NameEn = "ACV Product", NameAr = "منتج", Slug = $"acv-prod-{Guid.NewGuid()}", Price = 100 };
            db.Categories.Add(cat);
            db.Products.Add(product);
            await db.SaveChangesAsync();
            return product.Id;
        }

        public async Task<(Guid productId, string sku)> SeedProductWithVariantAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cat = new Category { Id = Guid.NewGuid(), NameEn = "ACV VarCat", NameAr = "فئة", Slug = $"acv-var-cat-{Guid.NewGuid()}", IsActive = true };
            var product = new Product { Id = Guid.NewGuid(), CategoryId = cat.Id, NameEn = "ACV Variant", NameAr = "متغير", Slug = $"acv-var-{Guid.NewGuid()}", Price = 100 };
            var sku = $"ACV-SKU-{Guid.NewGuid()}";
            var variant = new ProductVariant { Id = Guid.NewGuid(), ProductId = product.Id, Size = "M", ColorName = "Black", ColorNameAr = "أسود", ColorHex = "#000000", Sku = sku, Stock = 5, IsActive = true };
            db.Categories.Add(cat);
            db.Products.Add(product);
            db.ProductVariants.Add(variant);
            await db.SaveChangesAsync();
            return (product.Id, sku);
        }
    }
}

public class AdminCatalogCaller
{
    public Guid UserId { get; }
    public AdminCatalogCaller(Guid id) => UserId = id;
}

public class AdminCatalogAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AdminCatalogCaller _caller;

    public AdminCatalogAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AdminCatalogCaller caller)
        : base(options, logger, encoder) => _caller = caller;

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString()), new Claim(ClaimTypes.Role, UserRoles.Admin) };
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")), "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
