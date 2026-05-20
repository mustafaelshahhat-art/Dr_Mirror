using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Features.Orders.Common;

/// <summary>
/// Entity → DTO projections for the orders slice. Keep these small and
/// allocation-light; called once per response.
/// </summary>
internal static class OrderMappers
{
    /// <summary>
    /// Computes the <see cref="OrderDetailDto.PaymentStatusLabel"/> value
    /// based on the order's payment method kind and current status.
    /// </summary>
    private static string ComputePaymentStatusLabel(Order order)
    {
        if (order.PaymentMethodKind == PaymentMethodKind.Cod)
            return "cod";

        return order.Status switch
        {
            OrderStatus.Pending => "awaitingPayment",
            OrderStatus.PendingPaymentReview => "underReview",
            OrderStatus.Cancelled => "cancelled",
            _ => "paid",
        };
    }
    public static ShippingAddressDto ToDto(this ShippingAddress address) => new(
        address.RecipientName,
        address.Phone,
        address.Governorate,
        address.City,
        address.StreetAddress,
        address.Floor,
        address.Apartment,
        address.Landmark,
        address.Notes);

    public static OrderItemDto ToDto(this OrderItem item) => new(
        Id: item.Id,
        ProductId: item.ProductId,
        ProductSlug: item.Product?.Slug ?? string.Empty,
        ProductVariantId: item.ProductVariantId,
        NameAr: item.NameAr,
        NameEn: item.NameEn,
        Sku: item.Sku,
        Size: item.Size,
        ColorName: item.ColorName,
        ColorNameAr: item.ColorNameAr,
        ColorHex: item.ColorHex,
        PrimaryImageUrl: item.PrimaryImageUrl,
        UnitPrice: item.UnitPrice,
        Quantity: item.Quantity,
        LineTotal: item.LineTotal);

    public static OrderSummaryDto ToSummary(this Order order) => new(
        order.Id,
        order.OrderNumber,
        order.Status,
        order.Total,
        order.Items.Sum(i => i.Quantity),
        order.Currency,
        order.CreatedAt);

    public static PaymentProofDto ToDto(this PaymentProof proof, string orderNumber) => new(
        Id: proof.Id,
        FileUrl: $"/api/orders/{orderNumber}/proof/{proof.Id}/file",
        ContentType: proof.ContentType,
        SizeBytes: proof.SizeBytes,
        Status: proof.Status,
        ReviewedByUserId: proof.ReviewedByUserId,
        ReviewedByUserName: proof.ReviewedByUser?.FullName,
        ReviewedAt: proof.ReviewedAt,
        ReviewNote: proof.ReviewNote,
        UploadedAt: proof.UploadedAt);

    /// <summary>
    /// Entity → DTO projection for the full order detail response.
    /// </summary>
    /// <remarks>
    /// <b>Caller contract</b> — the <paramref name="order"/> must be loaded with
    /// these EF Core includes <b>before</b> being passed here, otherwise EF will
    /// either throw or silently return null for missing nav properties:
    /// <code>
    /// .Include(o => o.BuyerUser)
    /// .Include(o => o.PaymentMethod)
    /// .Include(o => o.Items).ThenInclude(i => i.Product)
    /// .Include(o => o.PaymentProofs).ThenInclude(p => p.ReviewedByUser)
    /// </code>
    /// Endpoints that <c>SaveChanges</c> and then re-query for the response must
    /// repeat these includes on the re-query (they are not retained after save).
    /// </remarks>
    public static OrderDetailDto ToDetail(this Order order, OrderStateMachine fsm) => new(
        Id: order.Id,
        OrderNumber: order.OrderNumber,
        Status: order.Status,
        SubTotal: order.SubTotal,
        ShippingFee: order.ShippingFee,
        Total: order.Total,
        Currency: order.Currency,
        ShippingAddress: order.ShippingAddress.ToDto(),
        PaymentMethodId: order.PaymentMethodId,
        PaymentMethodKind: order.PaymentMethodKind,
        PaymentMethodNameEn: order.PaymentMethodNameEn,
        PaymentMethodNameAr: order.PaymentMethodNameAr,
        // Payment-instruction snapshots with live fallback for
        // pre-migration orders where snapshot fields are null.
        PaymentInstructionsEn: order.PaymentInstructionsEn ?? order.PaymentMethod?.InstructionsEn,
        PaymentInstructionsAr: order.PaymentInstructionsAr ?? order.PaymentMethod?.InstructionsAr,
        PaymentAccountNumber: order.PaymentAccountNumber ?? order.PaymentMethod?.AccountNumber,
        PaymentAccountHolder: order.PaymentAccountHolder ?? order.PaymentMethod?.AccountHolder,
        BuyerNote: order.BuyerNote,
        CancellationReason: order.CancellationReason,
        CreatedAt: order.CreatedAt,
        UpdatedAt: order.UpdatedAt,
        ConfirmedAt: order.ConfirmedAt,
        PaidAt: order.PaidAt,
        ShippedAt: order.ShippedAt,
        DeliveredAt: order.DeliveredAt,
        CancelledAt: order.CancelledAt,
        PendingPaymentReviewAt: order.PendingPaymentReviewAt,
        PaymentStatusLabel: ComputePaymentStatusLabel(order),
        AllowedNextStatesForBuyer: fsm.NextStates(order.Status, OrderActor.Buyer),
        AllowedNextStatesForAdmin: fsm.NextStates(order.Status, OrderActor.Admin),
        Items: order.Items.OrderBy(i => i.CreatedAt).Select(i => i.ToDto()).ToList(),
        PaymentProofs: order.PaymentProofs.OrderByDescending(p => p.UploadedAt).Select(p => p.ToDto(order.OrderNumber)).ToList(),
        Buyer: new BuyerSummaryDto(
            order.BuyerUserId,
            order.BuyerUser?.FullName ?? string.Empty,
            order.BuyerUser?.Email ?? string.Empty));

    public static PaymentMethodDto ToDto(this PaymentMethod method) => new(
        method.Id,
        method.Code,
        method.Kind,
        method.NameAr,
        method.NameEn,
        method.InstructionsAr,
        method.InstructionsEn,
        method.AccountNumber,
        method.AccountHolder,
        method.DisplayOrder);
}
