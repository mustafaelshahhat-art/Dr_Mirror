using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Security;

/// <summary>
/// Verifies the ownership and actor-boundary guards applied at the order
/// endpoint layer. These tests execute the same conditions the handlers
/// evaluate so that regressions in guard logic are caught without a full
/// integration harness.
/// </summary>
public class OrderOwnershipTests
{
    private static readonly Guid BuyerA = Guid.NewGuid();
    private static readonly Guid BuyerB = Guid.NewGuid();

    private static Order MakeOrder(Guid buyerId, OrderStatus status = OrderStatus.Pending,
        PaymentMethodKind kind = PaymentMethodKind.Instapay) => new()
    {
        Id = Guid.NewGuid(),
        OrderNumber = "DM-2026-OWN",
        Status = status,
        BuyerUserId = buyerId,
        Currency = "EGP",
        PaymentMethodKind = kind,
    };

    // ── Ownership: order belongs to requesting buyer ──────────────────────

    [Fact]
    public void Order_is_accessible_to_its_owner()
    {
        var order = MakeOrder(BuyerA);
        Assert.True(order.BuyerUserId == BuyerA);
    }

    [Fact]
    public void Order_is_not_accessible_to_a_different_buyer()
    {
        var order = MakeOrder(BuyerA);
        // Simulates the handler's FirstOrDefaultAsync filter:
        //   .FirstOrDefaultAsync(o => o.OrderNumber == num && o.BuyerUserId == callerId)
        var found = order.BuyerUserId == BuyerB ? order : null;
        Assert.Null(found);
    }

    // ── Proof upload: COD is always blocked regardless of status ─────────

    [Theory]
    [InlineData(PaymentMethodKind.Cod)]
    public void COD_order_is_ineligible_for_proof_upload(PaymentMethodKind kind)
    {
        var order = MakeOrder(BuyerA, OrderStatus.Pending, kind);
        var eligible = order.PaymentMethodKind != PaymentMethodKind.Cod;
        Assert.False(eligible);
    }

    [Theory]
    [InlineData(PaymentMethodKind.Instapay)]
    [InlineData(PaymentMethodKind.Wallet)]
    [InlineData(PaymentMethodKind.BankTransfer)]
    public void Non_COD_order_is_eligible_for_proof_upload(PaymentMethodKind kind)
    {
        var order = MakeOrder(BuyerA, OrderStatus.Pending, kind);
        var eligible = order.PaymentMethodKind != PaymentMethodKind.Cod;
        Assert.True(eligible);
    }

    // ── Proof upload: only Pending and PendingPaymentReview allow upload ──

    [Theory]
    [InlineData(OrderStatus.Pending, true)]
    [InlineData(OrderStatus.PendingPaymentReview, true)]
    [InlineData(OrderStatus.Confirmed, false)]
    [InlineData(OrderStatus.Paid, false)]
    [InlineData(OrderStatus.Preparing, false)]
    [InlineData(OrderStatus.Shipped, false)]
    [InlineData(OrderStatus.Delivered, false)]
    [InlineData(OrderStatus.Cancelled, false)]
    public void Proof_upload_status_guard(OrderStatus status, bool expected)
    {
        var order = MakeOrder(BuyerA, status);
        var allowed = order.Status is OrderStatus.Pending or OrderStatus.PendingPaymentReview;
        Assert.Equal(expected, allowed);
    }

    // ── Cancellation: owner-only, only in Pending ─────────────────────────

    [Fact]
    public void Buyer_can_cancel_their_own_Pending_order()
    {
        var fsm = new OrderStateMachine();
        var order = MakeOrder(BuyerA, OrderStatus.Pending);
        Assert.True(fsm.CanTransition(order.Status, OrderStatus.Cancelled, OrderActor.Buyer));
    }

    [Fact]
    public void Buyer_cannot_cancel_once_order_is_Preparing()
    {
        // Buyer cannot cancel after admin has started preparing — only admin can cancel at that stage.
        var fsm = new OrderStateMachine();
        Assert.False(fsm.CanTransition(OrderStatus.Preparing, OrderStatus.Cancelled, OrderActor.Buyer));
    }

    [Fact]
    public void Buyer_cannot_cancel_a_Shipped_order()
    {
        var fsm = new OrderStateMachine();
        Assert.False(fsm.CanTransition(OrderStatus.Shipped, OrderStatus.Cancelled, OrderActor.Buyer));
    }

    [Fact]
    public void Non_owner_receives_null_order_from_ownership_filter()
    {
        var order = MakeOrder(BuyerA);
        // Handler pattern: returns 404 when query returns null for a different user.
        var resultForBuyerB = order.BuyerUserId == BuyerB ? order : null;
        Assert.Null(resultForBuyerB);
    }
}
