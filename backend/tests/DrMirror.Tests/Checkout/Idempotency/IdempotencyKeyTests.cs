using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Checkout.Idempotency;

[Collection(IntegrationTestCollection.Name)]
public class IdempotencyKeyTests : IClassFixture<IdempotencyKeyTests.Factory>
{
    private readonly Factory _factory;

    public IdempotencyKeyTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Same_buyer_same_idempotency_key_returns_same_order_and_creates_one_order()
    {
        var buyer = await _factory.CreateUserAsync($"idem-buyer-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var paymentMethodId = await _factory.SeedCheckoutCartAsync(buyer.Id, stock: 3, unitPrice: 100m);
        var key = Guid.NewGuid();
        var client = await AuthenticatedClientAsync(buyer.Id, key);
        var request = CheckoutRequest(paymentMethodId, _factory.GovernorateId);

        var first = await client.PostAsJsonAsync("/api/checkout", request);
        var second = await client.PostAsJsonAsync("/api/checkout", request);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var firstOrderNumber = await ReadStringAsync(first, "orderNumber");
        var secondOrderNumber = await ReadStringAsync(second, "orderNumber");
        Assert.Equal(firstOrderNumber, secondOrderNumber);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, db.Orders.Count(o => o.BuyerUserId == buyer.Id));
        Assert.Equal(1, db.OrderIdempotencyKeys.Count(k => k.Key == key && k.UserId == buyer.Id));
    }

    [Fact]
    public async Task Same_key_from_different_buyer_returns_409()
    {
        var buyerA = await _factory.CreateUserAsync($"idem-a-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var buyerB = await _factory.CreateUserAsync($"idem-b-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var paymentMethodId = await _factory.SeedCheckoutCartAsync(buyerA.Id, stock: 3, unitPrice: 100m);
        var key = Guid.NewGuid();

        var firstClient = await AuthenticatedClientAsync(buyerA.Id, key);
        var secondClient = await AuthenticatedClientAsync(buyerB.Id, key);
        var first = await firstClient.PostAsJsonAsync("/api/checkout", CheckoutRequest(paymentMethodId, _factory.GovernorateId));
        var second = await secondClient.PostAsJsonAsync("/api/checkout", CheckoutRequest(paymentMethodId, _factory.GovernorateId));

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    private async Task<HttpClient> AuthenticatedClientAsync(Guid userId, Guid idempotencyKey)
    {
        var token = await _factory.IssueAccessTokenAsync(userId, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-Idempotency-Key", idempotencyKey.ToString());
        return client;
    }

    private static object CheckoutRequest(Guid paymentMethodId, Guid governorateId) => new
    {
        governorateId,
        paymentMethodId,
        shippingAddress = new
        {
            recipientName = "Idempotent Buyer",
            phone = "01000000000",
            governorate = "cairo",
            city = "Maadi",
            streetAddress = "123 Street",
        },
    };

    private static async Task<string> ReadStringAsync(HttpResponseMessage response, string propertyName)
    {
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        return document.RootElement.GetProperty(propertyName).GetString()!;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public Guid GovernorateId { get; } = Guid.NewGuid();

        public async Task<Guid> SeedCheckoutCartAsync(Guid buyerId, int stock, decimal unitPrice)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (!db.GovernorateShippingFees.Any())
            {
                db.GovernorateShippingFees.Add(new GovernorateShippingFee
                {
                    Id = GovernorateId,
                    Slug = "cairo",
                    NameEn = "Cairo",
                    NameAr = "القاهرة",
                    Fee = 0m,
                    IsActive = true,
                });
            }
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
                NameEn = "Checkout Category",
                NameAr = "Checkout Category",
                Slug = $"checkout-category-{Guid.NewGuid():N}",
                IsActive = true,
            };
            var product = new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                NameEn = "Checkout Product",
                NameAr = "Checkout Product",
                Slug = $"checkout-product-{Guid.NewGuid():N}",
                IsPublished = true,
                Price = unitPrice,
            };
            var variant = new ProductVariant
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Sku = $"IDEM-{Guid.NewGuid():N}"[..18],
                Size = "M",
                ColorName = "Navy",
                ColorNameAr = "كحلي",
                ColorHex = "#001F3F",
                Stock = stock,
                IsActive = true,
            };
            var cart = new DrMirror.Api.Domain.Entities.Cart { Id = Guid.NewGuid(), UserId = buyerId };
            var item = new CartItem
            {
                Id = Guid.NewGuid(),
                CartId = cart.Id,
                ProductVariantId = variant.Id,
                Quantity = 1,
            };

            db.PaymentMethods.Add(paymentMethod);
            db.Categories.Add(category);
            db.Products.Add(product);
            db.ProductVariants.Add(variant);
            db.Carts.Add(cart);
            db.CartItems.Add(item);
            await db.SaveChangesAsync();
            return paymentMethod.Id;
        }
    }
}
