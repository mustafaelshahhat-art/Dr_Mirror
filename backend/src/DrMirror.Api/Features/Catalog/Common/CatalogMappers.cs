using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Features.Catalog.Common;

/// <summary>
/// Manual entity→DTO mappers. We deliberately avoid Mapster here so the
/// projection shape stays explicit and reviewable; the catalog hot path is
/// query-shaped server-side anyway via Select() (see GetProductsEndpoint).
/// </summary>
internal static class CatalogMappers
{
    public static CategoryDto ToDto(this Category c) =>
        new(c.Id, c.NameAr, c.NameEn, c.Slug, c.DisplayOrder);

    public static ProductImageDto ToDto(this ProductImage i) =>
        new(i.Id, i.Url, i.Alt, i.DisplayOrder);

    public static ProductVariantDto ToDto(this ProductVariant v) =>
        new(v.Id, v.Size, v.ColorName, v.ColorNameAr, v.ColorHex, v.Sku, v.Stock, v.IsActive);

    public static ProductDetailDto ToDetailDto(this Product p) => new(
        Id: p.Id,
        NameAr: p.NameAr,
        NameEn: p.NameEn,
        Slug: p.Slug,
        DescriptionAr: p.DescriptionAr,
        DescriptionEn: p.DescriptionEn,
        Price: p.Price,
        Gender: p.Gender,
        Material: p.Material,
        Brand: p.Brand,
        Sku: p.Sku,
        CreatedAt: p.CreatedAt,
        Category: p.Category!.ToDto(),
        Images: p.Images
            .OrderBy(i => i.DisplayOrder)
            .Select(i => i.ToDto())
            .ToList(),
        Variants: p.Variants
            .Where(v => v.IsActive)
            .OrderBy(v => v.ColorName)
            .ThenBy(v => v.Size)
            .Select(v => v.ToDto())
            .ToList());
}
