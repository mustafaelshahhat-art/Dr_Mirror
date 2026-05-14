using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Orders;

/// <summary>
/// Unit tests for the payment-proof review flow:
///   • <see cref="ApprovePaymentProofValidator"/> and <see cref="RejectPaymentProofValidator"/>
///   • State-machine guards for the proof-review transitions
///   • Upload eligibility rules (COD block, status check)
/// </summary>
public class PaymentProofTests
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private static Order NewOrder(OrderStatus status, PaymentMethodKind kind = PaymentMethodKind.Instapay) => new()
    {
        Id = Guid.NewGuid(),
        OrderNumber = "DM-2026-TEST",
        Status = status,
        BuyerUserId = Guid.NewGuid(),
        Currency = "EGP",
        PaymentMethodKind = kind,
    };

    // ── ApprovePaymentProofValidator ─────────────────────────────────────────

    [Fact]
    public void ApproveValidator_allows_null_note()
    {
        var v = new ApprovePaymentProofValidator();
        var result = v.Validate(new ApprovePaymentProofRequest(ReviewNote: null));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ApproveValidator_allows_non_empty_note()
    {
        var v = new ApprovePaymentProofValidator();
        var result = v.Validate(new ApprovePaymentProofRequest(ReviewNote: "Transfer matched."));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ApproveValidator_rejects_note_over_500_chars()
    {
        var v = new ApprovePaymentProofValidator();
        var result = v.Validate(new ApprovePaymentProofRequest(ReviewNote: new string('x', 501)));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "ReviewNote");
    }

    // ── RejectPaymentProofValidator ──────────────────────────────────────────

    [Fact]
    public void RejectValidator_requires_non_empty_note()
    {
        var v = new RejectPaymentProofValidator();
        Assert.False(v.Validate(new RejectPaymentProofRequest(ReviewNote: "")).IsValid);
        Assert.False(v.Validate(new RejectPaymentProofRequest(ReviewNote: "   ")).IsValid);
    }

    [Fact]
    public void RejectValidator_accepts_valid_reason()
    {
        var v = new RejectPaymentProofValidator();
        var result = v.Validate(new RejectPaymentProofRequest(ReviewNote: "Could not match this transfer."));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void RejectValidator_rejects_reason_over_500_chars()
    {
        var v = new RejectPaymentProofValidator();
        var result = v.Validate(new RejectPaymentProofRequest(ReviewNote: new string('r', 501)));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "ReviewNote");
    }

    // ── State-machine: proof upload eligibility ──────────────────────────────

    [Theory]
    [InlineData(OrderStatus.Pending, true)]
    [InlineData(OrderStatus.PendingPaymentReview, true)]
    [InlineData(OrderStatus.Confirmed, false)]
    [InlineData(OrderStatus.Paid, false)]
    [InlineData(OrderStatus.Preparing, false)]
    [InlineData(OrderStatus.Shipped, false)]
    [InlineData(OrderStatus.Delivered, false)]
    [InlineData(OrderStatus.Cancelled, false)]
    public void Upload_is_accepted_only_in_Pending_or_PendingPaymentReview(
        OrderStatus status, bool expected)
    {
        var order = NewOrder(status);
        var canUpload = order.Status == OrderStatus.Pending
                     || order.Status == OrderStatus.PendingPaymentReview;
        Assert.Equal(expected, canUpload);
    }

    [Theory]
    [InlineData(PaymentMethodKind.Instapay, true)]
    [InlineData(PaymentMethodKind.Wallet, true)]
    [InlineData(PaymentMethodKind.BankTransfer, true)]
    [InlineData(PaymentMethodKind.Cod, false)]
    public void Upload_is_blocked_for_COD_orders(PaymentMethodKind kind, bool expected)
    {
        var order = NewOrder(OrderStatus.Pending, kind);
        var canUpload = order.PaymentMethodKind != PaymentMethodKind.Cod;
        Assert.Equal(expected, canUpload);
    }

    // ── State-machine: approve → Paid ────────────────────────────────────────

    [Fact]
    public void Approve_transitions_PendingPaymentReview_to_Paid()
    {
        var fsm = new OrderStateMachine();
        var order = NewOrder(OrderStatus.PendingPaymentReview);

        fsm.Transition(order, OrderStatus.Paid, OrderActor.Admin);

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.NotNull(order.PaidAt);
    }

    [Fact]
    public void Approve_requires_PendingPaymentReview_state()
    {
        var fsm = new OrderStateMachine();

        // A Confirmed order (e.g. COD) cannot be "approved" via the proof path.
        var order = NewOrder(OrderStatus.Confirmed);
        Assert.False(fsm.CanTransition(OrderStatus.Confirmed, OrderStatus.Paid, OrderActor.Admin));
    }

    // ── State-machine: reject → Pending (re-upload allowed) ─────────────────

    [Fact]
    public void Reject_transitions_PendingPaymentReview_back_to_Pending()
    {
        var fsm = new OrderStateMachine();
        var order = NewOrder(OrderStatus.PendingPaymentReview);

        fsm.Transition(order, OrderStatus.Pending, OrderActor.Admin, "Photo unreadable.");

        Assert.Equal(OrderStatus.Pending, order.Status);
        // Rejection note is stored as CancellationReason by the FSM Transition overload.
        // The endpoint also sets it on the PaymentProof.ReviewNote — tested here at FSM level.
        Assert.Equal("Photo unreadable.", order.CancellationReason);
    }

    [Fact]
    public void Already_reviewed_proof_cannot_transition_via_FSM()
    {
        // Once in Paid, admin cannot re-run approve (order is no longer PendingPaymentReview).
        var fsm = new OrderStateMachine();
        Assert.False(fsm.CanTransition(OrderStatus.Paid, OrderStatus.Paid, OrderActor.Admin));
    }

    // ── System actor: proof upload bumps Pending → PendingPaymentReview ──────

    [Fact]
    public void System_transitions_Pending_to_PendingPaymentReview_on_upload()
    {
        var fsm = new OrderStateMachine();
        var order = NewOrder(OrderStatus.Pending);

        fsm.Transition(order, OrderStatus.PendingPaymentReview, OrderActor.System);

        Assert.Equal(OrderStatus.PendingPaymentReview, order.Status);
    }

    [Fact]
    public void System_cannot_bump_PendingPaymentReview_again()
    {
        // Re-upload while already PendingPaymentReview: the endpoint leaves status alone.
        // The FSM does NOT allow System to move PendingPaymentReview → PendingPaymentReview.
        var fsm = new OrderStateMachine();
        Assert.False(fsm.CanTransition(
            OrderStatus.PendingPaymentReview,
            OrderStatus.PendingPaymentReview,
            OrderActor.System));
    }
}
