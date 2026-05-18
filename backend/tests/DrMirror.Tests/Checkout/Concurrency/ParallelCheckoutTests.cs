using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Checkout.Concurrency;

[Collection(IntegrationTestCollection.Name)]
public class ParallelCheckoutTests : IClassFixture<ParallelCheckoutTests.Factory>
{
    private readonly Factory _factory;

    public ParallelCheckoutTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Ten_parallel_checkouts_for_last_stock_variant_produce_one_success_and_final_stock_zero()
    {
        var seeded = await _factory.SeedLastStockScenarioAsync(buyerCount: 10);
        var clients = seeded.BuyerIds.Select(MakeClient).ToArray();
        var request = new
        {
            paymentMethodId = seeded.PaymentMethodId,
            shippingAddress = new
            {
                recipientName = "Parallel Buyer",
                phone = "01000000000",
                governorate = "cairo",
                city = "Maadi",
                streetAddress = "123 Street",
            },
        };

        var responses = await Task.WhenAll(clients.Select(client => client.PostAsJsonAsync("/api/checkout", request)));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(9, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, db.ProductVariants.Single(v => v.Id == seeded.VariantId).Stock);
    }

    [Fact]
    public async Task Loser_checkout_gets_409_problem_details_not_500()
    {
        // Ten buyers racing for the last unit of stock. At least one loser must
        // return a 409 ProblemDetails (not a 500) — regression guard against NRE
        // from null-forgiving operators in the retry-loop error path.
        var seeded = await _factory.SeedLastStockScenarioAsync(buyerCount: 10);
        var clients = seeded.BuyerIds.Select(MakeClient).ToArray();
        var request = new
        {
            paymentMethodId = seeded.PaymentMethodId,
            shippingAddress = new
            {
                recipientName = "Race Buyer",
                phone = "01000000001",
                governorate = "cairo",
                city = "Mokattam",
                streetAddress = "456 Street",
            },
        };

        var responses = await Task.WhenAll(clients.Select(client =>
            client.PostAsJsonAsync("/api/checkout", request)));

        var losers = responses.Where(r => r.StatusCode == HttpStatusCode.Conflict).ToList();
        Assert.NotEmpty(losers);

        var loser = losers[0];
        Assert.NotNull(loser.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", loser.Content.Headers.ContentType!.MediaType);

        await using var body = await loser.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(body);
        var root = doc.RootElement;
        Assert.Equal(409, root.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("title").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("detail").GetString()));
        Assert.True(root.TryGetProperty("traceId", out _));
    }

    private HttpClient MakeClient(Guid userId)
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddAuthentication("TestAuth")
                    .AddScheme<AuthenticationSchemeOptions, ParallelCheckoutAuthHandler>("TestAuth", _ => { });
                services.AddScoped(_ => new ParallelCheckoutCaller(userId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
        private int _variantSaveCount;

        protected override void ConfigureDbContext(DbContextOptionsBuilder options)
        {
            base.ConfigureDbContext(options);
            options.AddInterceptors(new LastStockConcurrencyInterceptor(this));
        }

        public async Task<(Guid PaymentMethodId, Guid VariantId, Guid[] BuyerIds)> SeedLastStockScenarioAsync(int buyerCount)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var paymentMethod = new PaymentMethod
            {
                Id = Guid.NewGuid(),
                NameEn = "Instapay",
                NameAr = "Instapay",
                Kind = PaymentMethodKind.Instapay,
                IsActive = true,
            };
            var category = new Category
            {
                Id = Guid.NewGuid(),
                NameEn = "Parallel Category",
                NameAr = "Parallel Category",
                Slug = $"parallel-category-{Guid.NewGuid():N}",
                IsActive = true,
            };
            var product = new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                NameEn = "Parallel Product",
                NameAr = "Parallel Product",
                Slug = $"parallel-product-{Guid.NewGuid():N}",
                IsPublished = true,
                Price = 100m,
            };
            var variant = new ProductVariant
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Sku = $"PAR-{Guid.NewGuid():N}"[..18],
                Size = "M",
                ColorName = "Navy",
                ColorNameAr = "كحلي",
                ColorHex = "#001F3F",
                Stock = 1,
                IsActive = true,
            };

            db.PaymentMethods.Add(paymentMethod);
            db.Categories.Add(category);
            db.Products.Add(product);
            db.ProductVariants.Add(variant);

            var buyerIds = Enumerable.Range(0, buyerCount).Select(_ => Guid.NewGuid()).ToArray();
            foreach (var buyerId in buyerIds)
            {
                db.Users.Add(new User
                {
                    Id = buyerId,
                    FullName = $"Parallel {buyerId:N}",
                    Email = $"parallel-{buyerId:N}@example.com",
                    UserName = $"parallel-{buyerId:N}@example.com",
                    EmailConfirmed = true,
                });
                var cart = new DrMirror.Api.Domain.Entities.Cart { Id = Guid.NewGuid(), UserId = buyerId };
                db.Carts.Add(cart);
                db.CartItems.Add(new CartItem
                {
                    Id = Guid.NewGuid(),
                    CartId = cart.Id,
                    ProductVariantId = variant.Id,
                    Quantity = 1,
                });
            }

            await db.SaveChangesAsync();
            return (paymentMethod.Id, variant.Id, buyerIds);
        }

        public int IncrementVariantSaveCount() => Interlocked.Increment(ref _variantSaveCount);
    }

    private sealed class LastStockConcurrencyInterceptor : SaveChangesInterceptor
    {
        private readonly Factory _factory;

        public LastStockConcurrencyInterceptor(Factory factory)
        {
            _factory = factory;
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (eventData.Context?.ChangeTracker.Entries<ProductVariant>().Any(e => e.State == EntityState.Modified) == true
                && _factory.IncrementVariantSaveCount() >= 2)
            {
                throw new DbUpdateConcurrencyException("Simulated last-stock race.");
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }
}

public sealed class ParallelCheckoutCaller
{
    public Guid UserId { get; }

    public ParallelCheckoutCaller(Guid userId)
    {
        UserId = userId;
    }
}

public sealed class ParallelCheckoutAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly ParallelCheckoutCaller _caller;

    public ParallelCheckoutAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ParallelCheckoutCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString())], "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
