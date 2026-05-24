using DrMirror.Api.Domain.Catalog;

namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// A medical-apparel product in the marketplace (scrub top, scrub pants,
/// lab coat, surgical cap, footwear, etc.). One <see cref="Product"/> row
/// is the "marketing" record (name / description / fabric / brand). The
/// actual buyable SKU is a <see cref="ProductVariant"/> — one row per
/// Size × Color permutation, where stock and SKU codes live.
///
/// Decimal price is stored as decimal(18,2); single-currency (EGP).
/// </summary>
public class Product
{
    public Guid Id { get; set; }

    /// <summary>Arabic display name. Required.</summary>
    public string NameAr { get; set; } = string.Empty;

    /// <summary>English display name. Required (used to derive the slug).</summary>
    public string NameEn { get; set; } = string.Empty;

    /// <summary>URL slug; ASCII lowercase-kebab; globally unique.</summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>Long-form Arabic description. Markdown-friendly; rendered as plain text in M2.</summary>
    public string DescriptionAr { get; set; } = string.Empty;

    /// <summary>Long-form English description.</summary>
    public string DescriptionEn { get; set; } = string.Empty;

    /// <summary>Sale price in EGP. decimal(18,2). Apparel uses a single price across all variants in V1.</summary>
    public decimal Price { get; set; }

    /// <summary>Target audience: Men / Women / Unisex.</summary>
    public ProductGender Gender { get; set; } = ProductGender.Unisex;

    /// <summary>
    /// Free-form fabric / material composition, e.g.
    /// "65% polyester / 35% cotton", "100% cotton", "Performance microfibre blend".
    /// Optional. Max 200 chars.
    /// </summary>
    public string? Material { get; set; }

    /// <summary>Optional brand label, e.g. "Cherokee", "FIGS". Max 80.</summary>
    public string? Brand { get; set; }

    /// <summary>Optional master/product-level SKU. Variant SKUs live on <see cref="ProductVariant"/>. Max 64.</summary>
    public string? Sku { get; set; }

    /// <summary>Public visibility flag. Drafts / unpublished items are hidden from anonymous listings.</summary>
    public bool IsPublished { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] RowVersion { get; set; } = [];

    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();

    /// <summary>Size × Color permutations buyable from this product.</summary>
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}
