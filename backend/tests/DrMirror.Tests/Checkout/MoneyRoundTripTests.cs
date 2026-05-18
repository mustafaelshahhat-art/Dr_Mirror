using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Checkout;

[Collection(IntegrationTestCollection.Name)]
public class MoneyRoundTripTests : IClassFixture<MoneyRoundTripTests.Factory>
{
    private readonly Factory _factory;

    public MoneyRoundTripTests(Factory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("0.01")]
    [InlineData("1234.56")]
    [InlineData("9999.99")]
    public async Task Order_money_values_round_trip_exactly_from_db_to_api_dto(string value)
    {
        var amount = decimal.Parse(value, System.Globalization.CultureInfo.InvariantCulture);
        var buyer = await _factory.CreateUserAsync($"money-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var orderNumber = await _factory.SeedOrderWithLineAsync(buyer.Id, amount);
        var token = await _factory.IssueAccessTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(amount, document.RootElement.GetProperty("subTotal").GetDecimal());
        Assert.Equal(amount, document.RootElement.GetProperty("total").GetDecimal());
        var item = document.RootElement.GetProperty("items").EnumerateArray().Single();
        Assert.Equal(amount, item.GetProperty("unitPrice").GetDecimal());
        Assert.Equal(amount, item.GetProperty("lineTotal").GetDecimal());

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dbOrder = db.Orders.Single(o => o.OrderNumber == orderNumber);
        var dbItem = db.OrderItems.Single(i => i.OrderId == dbOrder.Id);
        Assert.Equal(amount, dbOrder.SubTotal);
        Assert.Equal(amount, dbOrder.Total);
        Assert.Equal(amount, dbItem.UnitPrice);
        Assert.Equal(amount, dbItem.LineTotal);
    }

    public class Factory : IntegrationWebAppFactory
    {
        public async Task<string> SeedOrderWithLineAsync(Guid buyerId, decimal amount)
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
                NameEn = "Money Category",
                NameAr = "Money Category",
                Slug = $"money-category-{Guid.NewGuid():N}",
                IsActive = true,
            };
            var product = new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = category.Id,
                NameEn = "Money Product",
                NameAr = "Money Product",
                Slug = $"money-product-{Guid.NewGuid():N}",
                IsPublished = true,
                Price = amount,
            };
            var variant = new ProductVariant
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Sku = $"MON-{Guid.NewGuid():N}"[..18],
                Size = "M",
                ColorName = "Navy",
                ColorNameAr = "كحلي",
                ColorHex = "#001F3F",
                Stock = 1,
                IsActive = true,
            };
            var orderNumber = $"DM-MON-{Guid.NewGuid():N}"[..20];
            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = orderNumber,
                BuyerUserId = buyerId,
                Status = OrderStatus.Pending,
                SubTotal = amount,
                ShippingFee = 0m,
                Total = amount,
                Currency = "EGP",
                PaymentMethodId = paymentMethod.Id,
                PaymentMethodKind = paymentMethod.Kind,
                PaymentMethodNameEn = paymentMethod.NameEn,
                PaymentMethodNameAr = paymentMethod.NameAr,
                ShippingAddress = new ShippingAddress
                {
                    RecipientName = "Money Buyer",
                    Phone = "01000000000",
                    Governorate = "cairo",
                    City = "Maadi",
                    StreetAddress = "123 Street",
                },
            };
            var item = new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ProductId = product.Id,
                ProductVariantId = variant.Id,
                NameAr = product.NameAr,
                NameEn = product.NameEn,
                Sku = variant.Sku,
                Size = variant.Size,
                ColorName = variant.ColorName,
                ColorNameAr = variant.ColorNameAr,
                ColorHex = variant.ColorHex,
                UnitPrice = amount,
                Quantity = 1,
                LineTotal = amount,
            };

            db.PaymentMethods.Add(paymentMethod);
            db.Categories.Add(category);
            db.Products.Add(product);
            db.ProductVariants.Add(variant);
            db.Orders.Add(order);
            db.OrderItems.Add(item);
            await db.SaveChangesAsync();
            return orderNumber;
        }
    }
}
