namespace DrMirror.Api.Features.Cart.Common;

/// <summary>
/// One line in the cart, projected with everything the cart UI needs to render
/// without round-tripping for product/variant details. Pricing reflects the
/// *current* product price; <see cref="UnitPriceSnapshot"/> is exposed for
/// the future "price changed since you added" affordance.
/// </summary>
public sealed record CartItemDto(
    Guid Id,
    Guid ProductId,
    string ProductSlug,
    string NameAr,
    string NameEn,
    Guid ProductVariantId,
    string Size,
    string ColorName,
    string ColorNameAr,
    string ColorHex,
    string Sku,
    int Quantity,
    decimal UnitPrice,
    decimal UnitPriceSnapshot,
    decimal LineTotal,
    int VariantStock,
    string? PrimaryImageUrl,
    bool IsAvailable);

public sealed record CartDto(
    Guid Id,
    IReadOnlyList<CartItemDto> Items,
    decimal SubTotal,
    int TotalQuantity,
    DateTimeOffset UpdatedAt);

public sealed record AddCartItemRequest(Guid ProductVariantId, int Quantity);

public sealed record UpdateCartItemRequest(int Quantity);

public sealed record MergeCartRequest(IReadOnlyList<MergeCartLine> Items);
public sealed record MergeCartLine(Guid ProductVariantId, int Quantity);
