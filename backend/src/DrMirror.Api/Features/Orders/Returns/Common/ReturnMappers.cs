using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Admin.Orders.Returns.Common;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Api.Features.Orders.Returns.Common;

public static class ReturnMappers
{
    public static ReturnRequestDto ToDto(this ReturnRequest request) => new(
        Id: request.Id,
        OrderNumber: request.Order?.OrderNumber ?? string.Empty,
        Status: request.Status,
        CustomerReason: request.CustomerReason,
        AdminNote: request.AdminNote,
        CreatedAt: request.CreatedAt,
        UpdatedAt: request.UpdatedAt,
        ReviewedAt: request.ReviewedAt,
        ReceivedAt: request.ReceivedAt,
        CompletedAt: request.CompletedAt,
        CancelledAt: request.CancelledAt,
        Items: request.Items.Select(i => i.ToDto()).ToList());

    public static ReturnRequestItemDto ToDto(this ReturnRequestItem item) => new(
        Id: item.Id,
        NameAr: item.NameAr,
        NameEn: item.NameEn,
        Sku: item.Sku,
        Size: item.Size,
        ColorName: item.ColorName,
        ColorNameAr: item.ColorNameAr,
        ColorHex: item.ColorHex,
        PrimaryImageUrl: item.PrimaryImageUrl,
        UnitPrice: item.UnitPrice,
        Quantity: item.Quantity);

    public static AdminReturnRequestDto ToAdminDto(this ReturnRequest request)
    {
        var order = request.Order;
        var shipping = order?.ShippingAddress;

        return new AdminReturnRequestDto(
            Id: request.Id,
            OrderNumber: order?.OrderNumber ?? string.Empty,
            BuyerFullName: request.BuyerUser?.FullName ?? string.Empty,
            BuyerEmail: request.BuyerUser?.Email,
            BuyerPhone: request.BuyerUser?.PhoneNumber,
            ReviewedByAdminName: request.ReviewedByAdmin?.FullName,
            Status: request.Status,
            CustomerReason: request.CustomerReason,
            AdminNote: request.AdminNote,
            CreatedAt: request.CreatedAt,
            UpdatedAt: request.UpdatedAt,
            ReviewedAt: request.ReviewedAt,
            ReceivedAt: request.ReceivedAt,
            CompletedAt: request.CompletedAt,
            CancelledAt: request.CancelledAt,
            ItemCount: request.Items.Sum(i => i.Quantity),
            TotalValue: request.Items.Sum(i => i.UnitPrice * i.Quantity),
            Items: request.Items.Select(i => i.ToDto()).ToList(),
            ShippingRecipientName: shipping?.RecipientName ?? string.Empty,
            ShippingPhone: shipping?.Phone ?? string.Empty,
            ShippingGovernorate: shipping?.Governorate ?? string.Empty,
            ShippingCity: shipping?.City ?? string.Empty,
            ShippingStreetAddress: shipping?.StreetAddress ?? string.Empty,
            ShippingFloor: shipping?.Floor,
            ShippingApartment: shipping?.Apartment,
            ShippingLandmark: shipping?.Landmark,
            ShippingNotes: shipping?.Notes,
            OrderSubTotal: order?.SubTotal ?? 0m,
            OrderShippingFee: order?.ShippingFee ?? 0m,
            OrderTotal: order?.Total ?? 0m,
            PaymentMethodNameEn: order?.PaymentMethodNameEn ?? string.Empty,
            PaymentMethodNameAr: order?.PaymentMethodNameAr ?? string.Empty,
            PaymentStatusLabel: ComputePaymentStatusLabel(order));
    }

    private static string ComputePaymentStatusLabel(Order? order)
    {
        if (order is null) return "cod";

        if (PaymentMethodClassification.Classify(order.PaymentMethodKind) == PaymentMethodGroup.Cod)
            return "cod";

        return order.Status switch
        {
            OrderStatus.Pending => "awaitingPayment",
            OrderStatus.PendingPaymentReview => "underReview",
            OrderStatus.Cancelled => "cancelled",
            _ => "paid",
        };
    }
}
