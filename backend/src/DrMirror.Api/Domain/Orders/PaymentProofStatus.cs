namespace DrMirror.Api.Domain.Orders;

/// <summary>
/// Lifecycle of a single payment-proof upload. A buyer can upload more than
/// one proof per order — the latest <see cref="Pending"/> one is the
/// authoritative one for admin review.
/// </summary>
public enum PaymentProofStatus
{
    /// <summary>Uploaded by the buyer; admin has not reviewed it yet.</summary>
    Pending = 0,

    /// <summary>Admin verified the transfer and approved the proof.</summary>
    Approved = 1,

    /// <summary>Admin rejected the proof. Buyer can upload another.</summary>
    Rejected = 2,
}
