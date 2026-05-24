using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Checkout.CreateOrder;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Checkout;

/// <summary>
/// Unit tests for <see cref="OrderFactory"/>. No I/O — exercises the pure
/// entity-building logic in isolation.
/// </summary>
public class OrderFactoryTests
{
    private static readonly OrderStateMachine Fsm = new();

    private static PaymentMethod MakePayment(PaymentMethodKind kind) =>
        new() { Id = Guid.NewGuid(), Kind = kind, NameEn = "Test", NameAr = "اختبار", IsActive = true };

    private static ShippingAddress MakeAddress() =>
        new() { RecipientName = "Alice", Phone = "01000000000", Governorate = "cairo", City = "Maadi", StreetAddress = "10 St" };

    private static ICollection<CartItem> MakeCartItems(int count = 2) =>
        Enumerable.Range(1, count).Select(i =>
        {
            var product = new Product
            {
                Id = Guid.NewGuid(),
                NameEn = $"Product {i}",
                NameAr = $"منتج {i}",
                Slug = $"product-{i}",
                Price = 100m * i,
                Images = [],
            };
            var variant = new ProductVariant
            {
                Id = Guid.NewGuid(),
                Sku = $"SKU-{i}",
                Size = "M",
                ColorName = "Red",
                ColorNameAr = "أحمر",
                ColorHex = "#ff0000",
                Stock = 10,
                Product = product,
            };
            return new CartItem
            {
                Id = Guid.NewGuid(),
                ProductVariant = variant,
                Quantity = 2,
            };
        }).ToList();

    private static Order BuildOrder(PaymentMethodKind kind, ICollection<CartItem>? items = null, string? buyerNote = null) =>
        OrderFactory.Build(
            "DM-001",
            Guid.NewGuid(),
            items ?? MakeCartItems(),
            MakePayment(kind),
            MakeAddress(),
            50m,
            "Cairo",
            "القاهرة",
            buyerNote,
            Fsm);

    [Fact]
    public void Cod_order_is_confirmed_after_build()
    {
        var order = BuildOrder(PaymentMethodKind.Cod);

        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(PaymentMethodKind.Cod, order.PaymentMethodKind);
        Assert.NotNull(order.ConfirmedAt);
    }

    [Fact]
    public void Non_cod_order_stays_pending_after_build()
    {
        var order = BuildOrder(PaymentMethodKind.Instapay);

        Assert.Equal(OrderStatus.Pending, order.Status);
        Assert.Equal(PaymentMethodKind.Instapay, order.PaymentMethodKind);
        Assert.Null(order.ConfirmedAt);
    }

    [Fact]
    public void Order_total_equals_sum_of_line_totals()
    {
        var items = MakeCartItems(2);
        var order = BuildOrder(PaymentMethodKind.Cod, items);

        // item 1: price=100, qty=2 -> lineTotal=200; item 2: price=200, qty=2 -> 400; shipping=50; total=650
        Assert.Equal(650m, order.Total);
        Assert.Equal(order.Items.Sum(i => i.LineTotal), order.SubTotal);
        Assert.Equal(50m, order.ShippingFee);
    }

    [Fact]
    public void Order_items_count_matches_cart_items()
    {
        var items = MakeCartItems(3);
        var order = BuildOrder(PaymentMethodKind.Cod, items);

        Assert.Equal(3, order.Items.Count);
    }

    [Fact]
    public void Order_item_snapshots_product_name_and_sku()
    {
        var items = MakeCartItems(1);
        var order = BuildOrder(PaymentMethodKind.Cod, items);

        var item = order.Items.Single();
        Assert.Equal("Product 1", item.NameEn);
        Assert.Equal("SKU-1", item.Sku);
    }

    [Fact]
    public void Order_number_and_buyer_id_are_set()
    {
        var buyerId = Guid.NewGuid();
        var order = OrderFactory.Build(
            "DM-TEST-123",
            buyerId,
            MakeCartItems(),
            MakePayment(PaymentMethodKind.Cod),
            MakeAddress(),
            50m,
            "Cairo",
            "القاهرة",
            "please hurry",
            Fsm);

        Assert.Equal("DM-TEST-123", order.OrderNumber);
        Assert.Equal(buyerId, order.BuyerUserId);
        Assert.Equal("please hurry", order.BuyerNote);
    }

    [Fact]
    public void Currency_is_always_egp()
    {
        var order = BuildOrder(PaymentMethodKind.Cod);

        Assert.Equal("EGP", order.Currency);
    }
}
