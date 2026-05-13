using DrMirror.Api.Domain.Catalog;

namespace DrMirror.Api.Features.Catalog.Common;

// -----------------------------------------------------------------------------
// Category-shaped DTOs
// -----------------------------------------------------------------------------

public sealed record CategoryDto(
    Guid Id,
    string NameAr,
    string NameEn,
    string Slug,
    int DisplayOrder);

// -----------------------------------------------------------------------------
// Product-shaped DTOs
// -----------------------------------------------------------------------------

public sealed record ProductImageDto(
    Guid Id,
    string Url,
    string? Alt,
    int DisplayOrder);

/// <summary>
/// One Size × Color permutation. Stock and Sku are at this level.
/// </summary>
public sealed record ProductVariantDto(
    Guid Id,
    string Size,
    string ColorName,
    string ColorNameAr,
    string ColorHex,
    string Sku,
    int Stock,
    bool IsActive);

/// <summary>
/// Compact swatch entry surfaced in list views so the card can paint a
/// colour-swatch row without round-tripping the full variant matrix.
/// </summary>
public sealed record ColorOption(
    string Name,
    string NameAr,
    string Hex);

/// <summary>Compact shape used in list/grid endpoints. No description, single image.</summary>
public sealed record ProductSummaryDto(
    Guid Id,
    string NameAr,
    string NameEn,
    string Slug,
    decimal Price,
    ProductGender Gender,
    string? Brand,
    string? PrimaryImageUrl,
    /// <summary>Distinct sizes that have at least one in-stock active variant.</summary>
    IReadOnlyList<string> AvailableSizes,
    /// <summary>Distinct colours that have at least one in-stock active variant.</summary>
    IReadOnlyList<ColorOption> AvailableColors,
    /// <summary>Total stock across every active variant; useful for "X in stock" headlines.</summary>
    int TotalStock,
    CategoryDto Category);

/// <summary>Full shape for the detail page — every field the renderer needs.</summary>
public sealed record ProductDetailDto(
    Guid Id,
    string NameAr,
    string NameEn,
    string Slug,
    string DescriptionAr,
    string DescriptionEn,
    decimal Price,
    ProductGender Gender,
    string? Material,
    string? Brand,
    string? Sku,
    DateTimeOffset CreatedAt,
    CategoryDto Category,
    IReadOnlyList<ProductImageDto> Images,
    IReadOnlyList<ProductVariantDto> Variants);

// -----------------------------------------------------------------------------
// List envelope
// -----------------------------------------------------------------------------

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
