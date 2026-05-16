using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Features.Orders.Common;

/// <summary>
/// The single authoritative source of allowed order-status transitions. Both
/// buyer and admin slices route every status change through here.
/// </summary>
/// <remarks>
/// <para>
/// Transition rights are scoped by <see cref="OrderActor"/> — e.g. only an admin
/// may move <c>Preparing → Shipped</c>; only a buyer (or admin) may cancel from
/// <c>Confirmed</c>; only the system itself may move <c>Pending →
/// PendingPaymentReview</c> (triggered by proof upload).
/// </para>
/// <para>
/// Add new transitions to <see cref="_allowed"/>; the runtime check below
/// makes invalid transitions impossible to commit.
/// </para>
/// </remarks>
public sealed class OrderStateMachine
{
    private static readonly Dictionary<(OrderStatus From, OrderActor Actor), OrderStatus[]> _allowed = new()
    {
        // -- Pending (initial for Instapay/Wallet; COD skips this). ---
        { (OrderStatus.Pending, OrderActor.Buyer), new[] { OrderStatus.Cancelled } },
        { (OrderStatus.Pending, OrderActor.Admin), new[] { OrderStatus.Cancelled } },
        { (OrderStatus.Pending, OrderActor.System), new[] { OrderStatus.PendingPaymentReview, OrderStatus.Confirmed } },

        // -- PendingPaymentReview (proof uploaded, awaiting admin). ---------------
        { (OrderStatus.PendingPaymentReview, OrderActor.Buyer), new[] { OrderStatus.Cancelled } },
        { (OrderStatus.PendingPaymentReview, OrderActor.Admin), new[] { OrderStatus.Paid, OrderStatus.Pending, OrderStatus.Cancelled } },

        // -- Confirmed (COD lands here at creation). ------------------------------
        { (OrderStatus.Confirmed, OrderActor.Buyer), new[] { OrderStatus.Cancelled } },
        { (OrderStatus.Confirmed, OrderActor.Admin), new[] { OrderStatus.Preparing, OrderStatus.Cancelled } },

        // -- Paid (Instapay/Wallet after admin approval). -------------------------
        { (OrderStatus.Paid, OrderActor.Admin), new[] { OrderStatus.Preparing, OrderStatus.Cancelled } },

        // -- Preparing → Shipped or Cancelled. ------------------------------------
        { (OrderStatus.Preparing, OrderActor.Admin), new[] { OrderStatus.Shipped, OrderStatus.Cancelled } },

        // -- Shipped → Delivered. (No cancel from Shipped — would need a refund). -
        { (OrderStatus.Shipped, OrderActor.Admin), new[] { OrderStatus.Delivered } },

        // Delivered and Cancelled are TERMINAL: no outgoing transitions for any actor.
    };

    /// <summary>Pure check — no side effects. Use it in validators / authorization decisions.</summary>
    public bool CanTransition(OrderStatus from, OrderStatus to, OrderActor actor)
        => _allowed.TryGetValue((from, actor), out var allowed) && allowed.Contains(to);

    /// <summary>
    /// Mutate <paramref name="order"/> to <paramref name="to"/>. Throws
    /// <see cref="InvalidOperationException"/> if the transition is not allowed
    /// for <paramref name="actor"/>. Also updates the matching timestamp.
    /// </summary>
    public void Transition(Order order, OrderStatus to, OrderActor actor, string? reason = null)
    {
        if (!CanTransition(order.Status, to, actor))
        {
            throw new InvalidOperationException(
                $"Order {order.OrderNumber}: transition {order.Status} → {to} is not allowed for {actor}.");
        }

        var now = DateTimeOffset.UtcNow;
        order.Status = to;
        order.UpdatedAt = now;

        switch (to)
        {
            case OrderStatus.Confirmed: order.ConfirmedAt = now; break;
            case OrderStatus.Paid: order.PaidAt = now; break;
            case OrderStatus.Shipped: order.ShippedAt = now; break;
            case OrderStatus.Delivered: order.DeliveredAt = now; break;
            case OrderStatus.Pending:
                if (!string.IsNullOrWhiteSpace(reason)) order.CancellationReason = reason;
                break;
            case OrderStatus.Cancelled:
                order.CancelledAt = now;
                if (!string.IsNullOrWhiteSpace(reason)) order.CancellationReason = reason;
                break;
        }
    }

    /// <summary>Enumerate the legal next states for the given <paramref name="actor"/>.</summary>
    public IReadOnlyList<OrderStatus> NextStates(OrderStatus from, OrderActor actor)
        => _allowed.TryGetValue((from, actor), out var allowed)
            ? allowed
            : Array.Empty<OrderStatus>();
}
