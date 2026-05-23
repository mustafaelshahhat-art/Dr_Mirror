using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Checkout.CreateOrder;

namespace DrMirror.Api.Features.Orders.Common;

/// <summary>One ordered SKU — all fields snapshotted at order time.</summary>
public sealed record OrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductSlug,
    Guid ProductVariantId,
    string NameAr,
    string NameEn,
    string Sku,
    string Size,
    string ColorName,
    string ColorNameAr,
    string ColorHex,
    string? PrimaryImageUrl,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

public sealed record ShippingAddressDto(
    string RecipientName,
    string Phone,
    string Governorate,
    string City,
    string StreetAddress,
    string? Floor,
    string? Apartment,
    string? Landmark,
    string? Notes);

public sealed record OrderSummaryDto(
    Guid Id,
    string OrderNumber,
    OrderStatus Status,
    decimal Total,
    int ItemCount,
    string Currency,
    DateTimeOffset CreatedAt);

public sealed record OrderDetailDto(
    Guid Id,
    string OrderNumber,
    OrderStatus Status,
    decimal SubTotal,
    decimal ShippingFee,
    decimal Total,
    string Currency,
    ShippingAddressDto ShippingAddress,
    Guid PaymentMethodId,
    PaymentMethodKind PaymentMethodKind,
    string PaymentMethodNameEn,
    string PaymentMethodNameAr,
    string? PaymentInstructionsEn,
    string? PaymentInstructionsAr,
    string? PaymentAccountNumber,
    string? PaymentAccountHolder,
    string? BuyerNote,
    string? CancellationReason,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ConfirmedAt,
    DateTimeOffset? PaidAt,
    DateTimeOffset? PreparingAt,
    DateTimeOffset? ShippedAt,
    DateTimeOffset? DeliveredAt,
    DateTimeOffset? CancelledAt,
    DateTimeOffset? PendingPaymentReviewAt,
    string PaymentStatusLabel,
    IReadOnlyList<OrderStatus> AllowedNextStatesForBuyer,
    IReadOnlyList<OrderStatus> AllowedNextStatesForAdmin,
    IReadOnlyList<OrderItemDto> Items,
    IReadOnlyList<PaymentProofDto> PaymentProofs,
    // Buyer-only summary (admin view also exposes it for convenience).
    BuyerSummaryDto Buyer)
{
    /// <summary>
    /// Populated by <c>CreateOrderEndpoint</c> to indicate whether the inline
    /// shipping address was persisted to the buyer's address book. For
    /// non-checkout reads of an order (e.g. GET /api/orders/{number}) the
    /// value defaults to <see cref="AddressSaveOutcome.NotRequested"/>.
    /// </summary>
    public AddressSaveOutcome AddressSaveOutcome { get; init; } = AddressSaveOutcome.NotRequested;
}

/// <summary>
/// One payment-proof upload visible on an order. Buyers see all proofs they
/// uploaded; admin sees them with reviewer info for audit.
/// </summary>
public sealed record PaymentProofDto(
    Guid Id,
    string FileUrl,
    string ContentType,
    long SizeBytes,
    PaymentProofStatus Status,
    Guid? ReviewedByUserId,
    string? ReviewedByUserName,
    DateTimeOffset? ReviewedAt,
    string? ReviewNote,
    DateTimeOffset UploadedAt);

/// <summary>Admin-only — never sent to the buyer for someone else's order.</summary>
public sealed record BuyerSummaryDto(
    Guid Id,
    string FullName,
    string Email);

public sealed record PaymentMethodDto(
    Guid Id,
    string Code,
    PaymentMethodKind Kind,
    string NameAr,
    string NameEn,
    string? InstructionsAr,
    string? InstructionsEn,
    string? AccountNumber,
    string? AccountHolder,
    int DisplayOrder);

// -----------------------------------------------------------------------------
// Request DTOs.
// -----------------------------------------------------------------------------

public sealed record CreateOrderRequest(
    Guid PaymentMethodId,
    ShippingAddressDto? ShippingAddress,
    /// <summary>
    /// If set, the order ships to a saved address with this id (ownership
    /// checked at the endpoint). Either <see cref="ShippingAddress"/> OR
    /// <see cref="BuyerAddressId"/> must be present.
    /// </summary>
    Guid? BuyerAddressId,
    /// <summary>If true and <see cref="ShippingAddress"/> is used, also save it to the buyer's address book.</summary>
    bool SaveAsNewAddress,
    string? Label,
    string? BuyerNote);

public sealed record CancelOrderRequest(string? Reason);

public sealed record TransitionOrderRequest(
    OrderStatus ToStatus,
    string? Reason);

public sealed record ApprovePaymentProofRequest(string? ReviewNote);

public sealed record RejectPaymentProofRequest(string ReviewNote);
