using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Addresses;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Checkout;

/// <summary>
/// Asserts the three states of the new <c>addressSaveOutcome</c> response
/// field (FR-017 / contracts/checkout-response.md):
///   - "not_requested" — saveAsNewAddress = false.
///   - "saved" — saveAsNewAddress = true and book has room (new row inserted).
///   - "skipped_book_full" — saveAsNewAddress = true but book is at cap (no row).
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class AddressSaveOutcomeTests : IClassFixture<AddressSaveOutcomeTests.Factory>
{
    private readonly Factory _factory;

    public AddressSaveOutcomeTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Not_requested_when_save_flag_is_false()
    {
        var buyer = await _factory.CreateUserAsync($"aso-noreq-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var paymentMethodId = await _factory.SeedCheckoutCartAsync(buyer.Id);
        var beforeCount = await _factory.AddressCountAsync(buyer.Id);

        var response = await PlaceOrderAsync(buyer.Id, paymentMethodId, saveAsNewAddress: false);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("not_requested", await ReadOutcomeAsync(response));
        Assert.Equal(beforeCount, await _factory.AddressCountAsync(buyer.Id));
    }

    [Fact]
    public async Task Saved_when_save_flag_true_and_book_has_room()
    {
        var buyer = await _factory.CreateUserAsync($"aso-saved-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var paymentMethodId = await _factory.SeedCheckoutCartAsync(buyer.Id);
        var beforeCount = await _factory.AddressCountAsync(buyer.Id);

        var response = await PlaceOrderAsync(buyer.Id, paymentMethodId, saveAsNewAddress: true, label: "Home");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("saved", await ReadOutcomeAsync(response));
        Assert.Equal(beforeCount + 1, await _factory.AddressCountAsync(buyer.Id));
    }

    [Fact]
    public async Task Skipped_book_full_when_book_is_at_cap()
    {
        var buyer = await _factory.CreateUserAsync($"aso-full-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        await _factory.FillAddressBookAsync(buyer.Id, AddressLimits.MaxAddressesPerUser);
        var paymentMethodId = await _factory.SeedCheckoutCartAsync(buyer.Id);
        var beforeCount = await _factory.AddressCountAsync(buyer.Id);
        Assert.Equal(AddressLimits.MaxAddressesPerUser, beforeCount);

        var response = await PlaceOrderAsync(buyer.Id, paymentMethodId, saveAsNewAddress: true, label: "Home");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("skipped_book_full", await ReadOutcomeAsync(response));
        Assert.Equal(beforeCount, await _factory.AddressCountAsync(buyer.Id));
    }

    private async Task<HttpResponseMessage> PlaceOrderAsync(
        Guid buyerId,
        Guid paymentMethodId,
        bool saveAsNewAddress,
        string? label = null)
    {
        var token = await _factory.IssueAccessTokenAsync(buyerId, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var body = new
        {
            paymentMethodId,
            shippingAddress = new
            {
                recipientName = "Buyer",
                phone = "01000000000",
                governorate = "cairo",
                city = "Maadi",
                streetAddress = "123 Street",
            },
            saveAsNewAddress,
            label,
        };
        return await client.PostAsJsonAsync("/api/checkout", body);
    }

    private static async Task<string> ReadOutcomeAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        return document.RootElement.GetProperty("addressSaveOutcome").GetString()!;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "AddressSaveOutcomeTests_" + Guid.NewGuid();

        public async Task<Guid> SeedCheckoutCartAsync(Guid buyerId)
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
                NameEn = "ASO Cat",
                NameAr = "فئة",
                Slug = $"aso-cat-{Guid.NewGuid()}",
                IsActive = true,
            };
            var product = new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                NameEn = "ASO Product",
                NameAr = "منتج",
                Slug = $"aso-prod-{Guid.NewGuid()}",
                IsPublished = true,
                Price = 100m,
            };
            var variant = new ProductVariant
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Sku = $"ASO-{Guid.NewGuid():N}"[..18],
                Size = "M",
                ColorName = "Navy",
                ColorNameAr = "كحلي",
                ColorHex = "#001F3F",
                Stock = 5,
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

        public async Task<int> AddressCountAsync(Guid userId)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return db.BuyerAddresses.Count(a => a.UserId == userId);
        }

        public async Task FillAddressBookAsync(Guid userId, int count)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            for (var i = 0; i < count; i++)
            {
                db.BuyerAddresses.Add(new BuyerAddress
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Label = $"Label-{i}",
                    RecipientName = "Buyer",
                    Phone = "01000000000",
                    Governorate = "cairo",
                    City = "Maadi",
                    StreetAddress = $"{i} Street",
                    IsDefault = i == 0,
                });
            }
            await db.SaveChangesAsync();
        }
    }
}
