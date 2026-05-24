using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Checkout;

[Collection(IntegrationTestCollection.Name)]
public class ConcurrentCheckoutTests : IClassFixture<ConcurrentCheckoutTests.Factory>
{
    private readonly Factory _factory;

    public ConcurrentCheckoutTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Two_simultaneous_checkouts_for_same_variant_results_in_one_success_one_conflict()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();

        var buyer1 = new User { Id = user1Id, FullName = "Buyer 1", Email = "buyer1@example.com", UserName = "buyer1@example.com" };
        var buyer2 = new User { Id = user2Id, FullName = "Buyer 2", Email = "buyer2@example.com", UserName = "buyer2@example.com" };

        var paymentMethod = new PaymentMethod { Id = Guid.NewGuid(), NameEn = "Instapay", NameAr = "Instapay", Kind = DrMirror.Api.Domain.Orders.PaymentMethodKind.Instapay, IsActive = true };
        var governorate = new GovernorateShippingFee { Id = Guid.NewGuid(), Slug = "cairo", NameEn = "Cairo", NameAr = "القاهرة", Fee = 0m, IsActive = true };

        var category = new Category { Id = Guid.NewGuid(), NameEn = "Cat", NameAr = "Cat", Slug = "cat", IsActive = true };
        var product = new Product { Id = Guid.NewGuid(), CategoryId = category.Id, NameEn = "P1", NameAr = "P1", Slug = "p1", IsPublished = true, Price = 100 };
        var variant = new ProductVariant { Id = Guid.NewGuid(), ProductId = product.Id, Sku = "SKU-1", Size = "M", ColorName = "Blue", ColorNameAr = "Blue", ColorHex = "#000", Stock = 1, IsActive = true, RowVersion = new byte[] { 1 } };

        db.Users.AddRange(buyer1, buyer2);
        db.Categories.Add(category);
        db.Products.Add(product);
        db.ProductVariants.Add(variant);
        db.PaymentMethods.Add(paymentMethod);
        db.GovernorateShippingFees.Add(governorate);

        var cart1 = new DrMirror.Api.Domain.Entities.Cart { Id = Guid.NewGuid(), UserId = user1Id, Items = new List<CartItem>() };
        var cart1Item = new CartItem { Id = Guid.NewGuid(), CartId = cart1.Id, ProductVariantId = variant.Id, Quantity = 1 };
        cart1.Items.Add(cart1Item);

        var cart2 = new DrMirror.Api.Domain.Entities.Cart { Id = Guid.NewGuid(), UserId = user2Id, Items = new List<CartItem>() };
        var cart2Item = new CartItem { Id = Guid.NewGuid(), CartId = cart2.Id, ProductVariantId = variant.Id, Quantity = 1 };
        cart2.Items.Add(cart2Item);

        db.Carts.AddRange(cart1, cart2);
        db.CartItems.AddRange(cart1Item, cart2Item);
        await db.SaveChangesAsync();

        var client1 = _factory.WithWebHostBuilder(b => {
            b.ConfigureServices(s => {
                s.AddAuthentication("TestAuth").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestAuth", options => { });
                s.AddScoped(_ => new TestAuthUser(user1Id));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client1.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");

        var client2 = _factory.WithWebHostBuilder(b => {
            b.ConfigureServices(s => {
                s.AddAuthentication("TestAuth").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestAuth", options => { });
                s.AddScoped(_ => new TestAuthUser(user2Id));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client2.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");

        var req = new
        {
            PaymentMethodId = paymentMethod.Id,
            GovernorateId = governorate.Id,
            ShippingAddress = new
            {
                RecipientName = "Test",
                Phone = "01000000000",
                Governorate = "Cairo",
                City = "Maadi",
                StreetAddress = "123 Street"
            }
        };

        var task1 = client1.PostAsJsonAsync("/api/checkout", req);
        var task2 = client2.PostAsJsonAsync("/api/checkout", req);

        var results = await Task.WhenAll(task1, task2);

        var c1 = await results[0].Content.ReadAsStringAsync();
        var c2 = await results[1].Content.ReadAsStringAsync();

        var successCount = results.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = results.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        Assert.True(successCount == 1, $"Expected 1 success, got {successCount}. Response1: {c1}. Response2: {c2}");
        Assert.Equal(1, conflictCount);
    }

    public class Factory : IntegrationWebAppFactory
    {
        private int _saveCount = 0;

        public override string DbName { get; } = "ConcurrentCheckoutTest_" + Guid.NewGuid();

        protected override void ConfigureDbContext(DbContextOptionsBuilder options)
        {
            base.ConfigureDbContext(options);
            options.AddInterceptors(new ConcurrencyInterceptor(this));
        }

        public int IncrementAndGetSaveCount() => Interlocked.Increment(ref _saveCount);
    }

    public class ConcurrencyInterceptor : SaveChangesInterceptor
    {
        private readonly Factory _factory;
        public ConcurrencyInterceptor(Factory factory) => _factory = factory;

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            var db = eventData.Context;
            if (db != null)
            {
                var variants = db.ChangeTracker.Entries<ProductVariant>().Where(e => e.State == EntityState.Modified).ToList();
                if (variants.Any())
                {
                    var count = _factory.IncrementAndGetSaveCount();
                    if (count >= 2)
                    {
                        throw new DbUpdateConcurrencyException("Simulated concurrency exception", new Exception());
                    }
                }
            }
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }
}

public class TestAuthUser
{
    public Guid UserId { get; }
    public TestAuthUser(Guid userId) => UserId = userId;
}

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly TestAuthUser _user;
    public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, TestAuthUser user)
        : base(options, logger, encoder)
    {
        _user = user;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, _user.UserId.ToString()) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
