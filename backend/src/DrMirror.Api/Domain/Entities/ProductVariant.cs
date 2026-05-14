namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// One Size × Color permutation of a <see cref="Product"/>. The variant is the
/// real "buyable" SKU — stock and SKU codes live here, not on Product.
///
/// Sizes are stored as free-form strings to accommodate both letter sizes
/// (XS / S / M / L / XL / XXL / XXXL) and footwear EU numerics (36 → 46) on
/// the same column. Validation of permitted values happens in the admin
/// upload UI (M4) and catalog seeders, not at the schema level.
/// </summary>
public class ProductVariant
{
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }
    public Product? Product { get; set; }

    /// <summary>
    /// Size label as displayed to the buyer. Required, max 16 chars.
    /// Examples: "XS", "S", "M", "L", "XL", "XXL", "XXXL", "36", "37", …, "46".
    /// </summary>
    public string Size { get; set; } = string.Empty;

    /// <summary>
    /// Display name for the colour, in English. Required, max 60 chars.
    /// Examples: "Navy Blue", "Black", "Wine".
    /// The Arabic side is rendered from <see cref="ColorNameAr"/>.
    /// </summary>
    public string ColorName { get; set; } = string.Empty;

    /// <summary>
    /// Arabic display name for the colour. Required, max 60 chars.
    /// </summary>
    public string ColorNameAr { get; set; } = string.Empty;

    /// <summary>
    /// HTML hex code (with leading "#") used to paint colour swatches in the
    /// UI. Required, exactly 7 chars (e.g. "#0F2A5C").
    /// </summary>
    public string ColorHex { get; set; } = "#000000";

    /// <summary>
    /// Variant-level SKU. Unique across the catalogue. Max 64.
    /// Convention: <c>{ProductSku}-{Size}-{ColorSlug}</c>, e.g. "CHK-VST-001-M-NVY".
    /// </summary>
    public string Sku { get; set; } = string.Empty;

    /// <summary>Stock count for this exact Size × Color permutation.</summary>
    public int Stock { get; set; }

    /// <summary>
    /// Soft-disable flag. Lets us hide a variant (e.g. discontinued color)
    /// without deleting historical sales rows that point to it.
    /// </summary>
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// SQL Server <c>rowversion</c> token used as an EF Core concurrency
    /// guard. When two checkouts race to decrement the same variant, the
    /// loser gets a <see cref="Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException"/>
    /// at <c>SaveChangesAsync</c>; <see cref="DrMirror.Api.Features.Checkout.CreateOrder.CreateOrderEndpoint"/>
    /// catches it, re-reads stock, re-validates, and retries once.
    /// </summary>
    public byte[] RowVersion { get; set; } = [];
}
