using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Admin.Orders.Returns.Common;

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

    public static AdminReturnRequestDto ToAdminDto(this ReturnRequest request) => new(
        Id: request.Id,
        OrderNumber: request.Order?.OrderNumber ?? string.Empty,
        BuyerFullName: request.BuyerUser?.FullName ?? string.Empty,
        BuyerEmail: request.BuyerUser?.Email,
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
        Items: request.Items.Select(i => i.ToDto()).ToList());
}
