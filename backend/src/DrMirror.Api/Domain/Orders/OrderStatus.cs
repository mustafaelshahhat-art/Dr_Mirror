namespace DrMirror.Api.Domain.Orders;

/// <summary>
/// Lifecycle states an order can occupy. The legal transitions between them
/// are encoded in <c>OrderStateMachine</c>; never mutate <c>Order.Status</c>
/// directly outside that class.
/// </summary>
public enum OrderStatus
{
    /// <summary>
    /// Initial state for Instapay/Wallet flows (Phase 2b). COD orders skip
    /// straight to <see cref="Confirmed"/> at creation time.
    /// </summary>
    Pending = 0,

    /// <summary>Buyer's contract is locked in. For COD this is the on-creation state.</summary>
    Confirmed = 1,

    /// <summary>Buyer uploaded a payment proof — awaiting admin review (Phase 2b).</summary>
    PendingPaymentReview = 2,

    /// <summary>Admin approved the payment proof.</summary>
    Paid = 3,

    /// <summary>Warehouse is packing the order.</summary>
    Preparing = 4,

    /// <summary>Handed to the courier.</summary>
    Shipped = 5,

    /// <summary>Delivered to the buyer. Terminal — no further transitions.</summary>
    Delivered = 6,

    /// <summary>Cancelled (by buyer pre-prep, or by admin at any non-terminal state). Terminal.</summary>
    Cancelled = 99,
}

/// <summary>Who is requesting an order transition. Different actors have different rights.</summary>
public enum OrderActor
{
    Buyer,
    Admin,
    /// <summary>Triggered by an automatic system event — checkout, payment-proof upload, etc.</summary>
    System,
}
