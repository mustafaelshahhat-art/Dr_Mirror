namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// A single image attached to a <see cref="Product"/>. In M2 we seed
/// picsum.photos URLs; in M4 these become Cloudinary-managed and we
/// add CloudinaryPublicId/etc. non-breakingly.
/// </summary>
public class ProductImage
{
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }
    public Product? Product { get; set; }

    /// <summary>Absolute URL the browser can load directly (HTTPS only).</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>Optional alt text for accessibility. Falls back to product NameEn at render time.</summary>
    public string? Alt { get; set; }

    /// <summary>Render order within the product's gallery. 0 = primary.</summary>
    public int DisplayOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
