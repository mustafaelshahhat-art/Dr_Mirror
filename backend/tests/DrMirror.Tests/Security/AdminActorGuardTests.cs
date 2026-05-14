using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Security;

/// <summary>
/// Verifies that the <see cref="OrderStateMachine"/> enforces actor boundaries:
/// admin-only transitions must be rejected for the Buyer actor, and
/// buyer-only transitions must be rejected for the Admin actor.
/// </summary>
public class AdminActorGuardTests
{
    private readonly OrderStateMachine _fsm = new();

    // ── Admin-only transitions: Buyer must be rejected ────────────────────

    [Theory]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered)]
    [InlineData(OrderStatus.PendingPaymentReview, OrderStatus.Paid)]
    [InlineData(OrderStatus.PendingPaymentReview, OrderStatus.Pending)] // reject proof
    public void Buyer_cannot_execute_admin_only_transitions(
        OrderStatus from, OrderStatus to)
    {
        Assert.False(_fsm.CanTransition(from, to, OrderActor.Buyer),
            $"Buyer must NOT be able to transition {from} → {to}");
    }

    // ── Buyer cannot advance fulfillment (admin-only logistics) ───────────

    [Theory]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered)]
    public void Buyer_cannot_advance_order_through_fulfillment(
        OrderStatus from, OrderStatus to)
    {
        Assert.False(_fsm.CanTransition(from, to, OrderActor.Buyer),
            $"Buyer must NOT be able to transition {from} → {to} (admin-only)");
    }

    // ── Buyer cannot cancel once in the fulfillment pipeline ─────────────

    [Theory]
    [InlineData(OrderStatus.Preparing)]
    [InlineData(OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered)]
    public void Buyer_cannot_cancel_fulfilled_orders(OrderStatus status)
    {
        Assert.False(_fsm.CanTransition(status, OrderStatus.Cancelled, OrderActor.Buyer),
            $"Buyer must NOT be able to cancel from {status}");
    }

    // ── System-actor boundary ─────────────────────────────────────────────

    [Theory]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered)]
    public void System_actor_cannot_execute_admin_logistics_transitions(
        OrderStatus from, OrderStatus to)
    {
        Assert.False(_fsm.CanTransition(from, to, OrderActor.System),
            $"System must NOT be able to transition {from} → {to}");
    }

    [Fact]
    public void System_can_move_Pending_to_PendingPaymentReview_on_proof_upload()
    {
        Assert.True(_fsm.CanTransition(
            OrderStatus.Pending,
            OrderStatus.PendingPaymentReview,
            OrderActor.System));
    }

    // ── Admin happy-path transitions ──────────────────────────────────────

    [Theory]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Preparing)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Shipped)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered)]
    [InlineData(OrderStatus.PendingPaymentReview, OrderStatus.Paid)]
    public void Admin_can_execute_logistics_transitions(
        OrderStatus from, OrderStatus to)
    {
        Assert.True(_fsm.CanTransition(from, to, OrderActor.Admin),
            $"Admin MUST be able to transition {from} → {to}");
    }

    // ── Idempotency: no self-transitions are allowed ──────────────────────

    [Theory]
    [InlineData(OrderStatus.Pending)]
    [InlineData(OrderStatus.Confirmed)]
    [InlineData(OrderStatus.Paid)]
    [InlineData(OrderStatus.Preparing)]
    [InlineData(OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered)]
    [InlineData(OrderStatus.Cancelled)]
    public void No_actor_can_transition_a_status_to_itself(OrderStatus status)
    {
        Assert.False(_fsm.CanTransition(status, status, OrderActor.Admin));
        Assert.False(_fsm.CanTransition(status, status, OrderActor.Buyer));
        Assert.False(_fsm.CanTransition(status, status, OrderActor.System));
    }
}
