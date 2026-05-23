using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Orders;

[Collection(SqlServerTestCollection.Name)]
public class CodOrderHappyPathTests : IClassFixture<CodOrderHappyPathTests.Factory>
{
    private readonly Factory _factory;

    public CodOrderHappyPathTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Cod_order_moves_through_fulfillment_without_payment_proof()
    {
        if (!Factory.IsAvailable) return;

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var fsm = scope.ServiceProvider.GetRequiredService<OrderStateMachine>();

        var order = await SeedOrderAsync(db, PaymentMethodKind.Cod, OrderStatus.Confirmed);

        fsm.Transition(order, OrderStatus.Preparing, OrderActor.Admin);
        fsm.Transition(order, OrderStatus.Shipped, OrderActor.Admin);
        fsm.Transition(order, OrderStatus.Delivered, OrderActor.Admin);
        await db.SaveChangesAsync();

        var saved = await db.Orders
            .Include(o => o.PaymentProofs)
            .SingleAsync(o => o.Id == order.Id);

        Assert.Equal(OrderStatus.Delivered, saved.Status);
        Assert.NotNull(saved.PreparingAt);
        Assert.NotNull(saved.ShippedAt);
        Assert.NotNull(saved.DeliveredAt);
        Assert.Null(saved.PaidAt);
        Assert.Empty(saved.PaymentProofs);
    }

    private static async Task<Order> SeedOrderAsync(AppDbContext db, PaymentMethodKind kind, OrderStatus status)
    {
        var buyer = new User
        {
            Id = Guid.NewGuid(),
            UserName = $"cod-buyer-{Guid.NewGuid():N}@example.com",
            Email = $"cod-buyer-{Guid.NewGuid():N}@example.com",
            FullName = "COD Buyer",
            EmailConfirmed = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        var paymentMethod = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            Code = $"cod-{Guid.NewGuid():N}"[..32],
            Kind = kind,
            NameEn = "Cash on Delivery",
            NameAr = "الدفع عند الاستلام",
            IsActive = true,
        };
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = $"DM-COD-{Guid.NewGuid():N}"[..20],
            BuyerUserId = buyer.Id,
            BuyerUser = buyer,
            Status = status,
            SubTotal = 100,
            ShippingFee = 0,
            Total = 100,
            Currency = "EGP",
            PaymentMethodId = paymentMethod.Id,
            PaymentMethod = paymentMethod,
            PaymentMethodKind = kind,
            PaymentMethodNameEn = paymentMethod.NameEn,
            PaymentMethodNameAr = paymentMethod.NameAr,
            ConfirmedAt = DateTimeOffset.UtcNow,
            ShippingAddress = new ShippingAddress
            {
                RecipientName = "COD Buyer",
                Phone = "01000000000",
                Governorate = "cairo",
                City = "Maadi",
                StreetAddress = "123 Street",
            },
        };

        db.Users.Add(buyer);
        db.PaymentMethods.Add(paymentMethod);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return order;
    }

    public class Factory : SqlServerWebAppFactory { }
}
