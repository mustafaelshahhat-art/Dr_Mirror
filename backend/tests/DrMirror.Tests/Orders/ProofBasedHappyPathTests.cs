using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Orders;

[Collection(SqlServerTestCollection.Name)]
public class ProofBasedHappyPathTests : IClassFixture<ProofBasedHappyPathTests.Factory>
{
    private readonly Factory _factory;

    public ProofBasedHappyPathTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Instapay_order_moves_from_proof_upload_to_delivery()
    {
        if (!Factory.IsAvailable) return;

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var fsm = scope.ServiceProvider.GetRequiredService<OrderStateMachine>();

        var order = await SeedOrderAsync(db);

        var proof = new PaymentProof
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            FileUrl = $"/api/orders/{order.OrderNumber}/proof/proof-1/file",
            FileKey = $"payment-proofs/{order.OrderNumber}/proof-1.jpg",
            ContentType = "image/jpeg",
            SizeBytes = 1024,
            Status = PaymentProofStatus.Pending,
            UploadedAt = DateTimeOffset.UtcNow,
        };
        db.PaymentProofs.Add(proof);
        fsm.Transition(order, OrderStatus.PendingPaymentReview, OrderActor.System);

        proof.Status = PaymentProofStatus.Approved;
        proof.ReviewedAt = DateTimeOffset.UtcNow;
        proof.ReviewNote = "matches bank receipt";
        fsm.Transition(order, OrderStatus.Paid, OrderActor.Admin);
        fsm.Transition(order, OrderStatus.Preparing, OrderActor.Admin);
        fsm.Transition(order, OrderStatus.Shipped, OrderActor.Admin);
        fsm.Transition(order, OrderStatus.Delivered, OrderActor.Admin);
        await db.SaveChangesAsync();

        var saved = await db.Orders
            .Include(o => o.PaymentProofs)
            .SingleAsync(o => o.Id == order.Id);

        var savedProof = Assert.Single(saved.PaymentProofs);
        Assert.Equal(PaymentProofStatus.Approved, savedProof.Status);
        Assert.Equal(OrderStatus.Delivered, saved.Status);
        Assert.NotNull(saved.PendingPaymentReviewAt);
        Assert.NotNull(saved.PaidAt);
        Assert.NotNull(saved.PreparingAt);
        Assert.NotNull(saved.ShippedAt);
        Assert.NotNull(saved.DeliveredAt);
    }

    private static async Task<Order> SeedOrderAsync(AppDbContext db)
    {
        var buyer = new User
        {
            Id = Guid.NewGuid(),
            UserName = $"proof-buyer-{Guid.NewGuid():N}@example.com",
            Email = $"proof-buyer-{Guid.NewGuid():N}@example.com",
            FullName = "Proof Buyer",
            EmailConfirmed = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        var paymentMethod = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            Code = $"instapay-{Guid.NewGuid():N}"[..32],
            Kind = PaymentMethodKind.Instapay,
            NameEn = "Instapay",
            NameAr = "إنستاباي",
            AccountNumber = "01000000000",
            AccountHolder = "Dr Mirror",
            IsActive = true,
        };
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = $"DM-PRF-{Guid.NewGuid():N}"[..20],
            BuyerUserId = buyer.Id,
            BuyerUser = buyer,
            Status = OrderStatus.Pending,
            SubTotal = 100,
            ShippingFee = 0,
            Total = 100,
            Currency = "EGP",
            PaymentMethodId = paymentMethod.Id,
            PaymentMethod = paymentMethod,
            PaymentMethodKind = PaymentMethodKind.Instapay,
            PaymentMethodNameEn = paymentMethod.NameEn,
            PaymentMethodNameAr = paymentMethod.NameAr,
            ShippingAddress = new ShippingAddress
            {
                RecipientName = "Proof Buyer",
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
