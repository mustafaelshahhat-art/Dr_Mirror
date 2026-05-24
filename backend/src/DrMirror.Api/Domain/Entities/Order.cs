using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// The buyer's commitment to a basket at a moment in time. Aggregate root —
/// owns its line items and shipping address.
/// </summary>
/// <remarks>
/// <para>
/// Status mutations MUST go through <c>OrderStateMachine</c>. Direct assignment
/// of <see cref="Status"/> outside that class is forbidden by code review.
/// </para>
/// <para>
/// Snapshots: every <see cref="OrderItem"/> row freezes the name, colour, size,
/// SKU, and unit price at order time, so later edits to the upstream catalog
/// never rewrite history. <see cref="ShippingAddress"/> is also a snapshot.
/// </para>
/// </remarks>
public class Order
{
    public Guid Id { get; set; }

    /// <summary>Human-friendly order number, e.g. <c>DM-2026-000123</c>. Unique + indexed.</summary>
    public string OrderNumber { get; set; } = string.Empty;

    /// <summary>FK to the buyer (<see cref="User"/>). Indexed for "my orders" listing.</summary>
    public Guid BuyerUserId { get; set; }
    public User? BuyerUser { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    /// <summary>
    /// Sum of <see cref="OrderItem.LineTotal"/> at checkout time. Frozen — recalculating
    /// from items later would re-apply any subsequent price changes.
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>Flat shipping fee snapshotted from the selected governorate at checkout.</summary>
    public decimal ShippingFee { get; set; }

    public string? ShippingGovernorateNameEn { get; set; }
    public string? ShippingGovernorateNameAr { get; set; }

    /// <summary><see cref="SubTotal"/> + <see cref="ShippingFee"/>.</summary>
    public decimal Total { get; set; }

    /// <summary>ISO-4217 code. Always <c>EGP</c> in V1.</summary>
    public string Currency { get; set; } = "EGP";

    public ShippingAddress ShippingAddress { get; set; } = new();

    /// <summary>FK to the chosen payment method. Snapshotted name/kind below.</summary>
    public Guid PaymentMethodId { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }

    /// <summary>Snapshot of the payment method kind at checkout — drives historical UX.</summary>
    public PaymentMethodKind PaymentMethodKind { get; set; }

    /// <summary>Snapshot of the payment method display name (en / ar) at checkout.</summary>
    public string PaymentMethodNameEn { get; set; } = string.Empty;
    public string PaymentMethodNameAr { get; set; } = string.Empty;

    /// <summary>Free-text buyer note attached at checkout (max 1000).</summary>
    public string? BuyerNote { get; set; }

    /// <summary>Cancellation reason captured when status moves to Cancelled.</summary>
    public string? CancellationReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? ConfirmedAt { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? PreparingAt { get; set; }
    public DateTimeOffset? ShippedAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public DateTimeOffset? PendingPaymentReviewAt { get; set; }

    /// <summary>Auto-generated SQL Server rowversion for optimistic concurrency.</summary>
    public byte[]? RowVersion { get; set; }

    /// <summary>Snapshotted from PaymentMethod.AccountNumber at checkout.</summary>
    public string? PaymentAccountNumber { get; set; }

    /// <summary>Snapshotted from PaymentMethod.AccountHolder at checkout.</summary>
    public string? PaymentAccountHolder { get; set; }

    /// <summary>Snapshotted from PaymentMethod.InstructionsEn at checkout.</summary>
    public string? PaymentInstructionsEn { get; set; }

    /// <summary>Snapshotted from PaymentMethod.InstructionsAr at checkout.</summary>
    public string? PaymentInstructionsAr { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

    /// <summary>
    /// Payment-proof uploads (Instapay / Wallet flow). Empty for
    /// COD orders. The latest <c>Pending</c> proof is the authoritative one
    /// for admin review.
    /// </summary>
    public ICollection<PaymentProof> PaymentProofs { get; set; } = new List<PaymentProof>();
}
