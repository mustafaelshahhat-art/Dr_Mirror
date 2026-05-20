namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// A single image attached to a <see cref="Product"/>. Dev-seeded rows use
/// curated Unsplash URLs; admin uploads route through <c>IFileStorageService</c>
/// and populate <see cref="FileKey"/> so subsequent deletes can purge the
/// underlying blob.
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

    /// <summary>
    /// Storage-driver-specific key needed to purge the blob (Cloudinary
    /// <c>public_id</c> or the local relative path). Null for legacy
    /// seed rows that point at external URLs we don't manage.
    /// </summary>
    public string? FileKey { get; set; }

    /// <summary>MIME type captured at upload time. Null for legacy rows.</summary>
    public string? ContentType { get; set; }

    /// <summary>File size in bytes. Null for legacy rows.</summary>
    public long? SizeBytes { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
