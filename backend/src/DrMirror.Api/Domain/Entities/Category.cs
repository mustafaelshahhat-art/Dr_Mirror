namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// Taxonomy node. Flat in M2 — there is no parent_id. We can introduce
/// hierarchy later non-breakingly by adding a nullable ParentId column.
///
/// Names are stored per-locale (NameAr / NameEn) per the locked decision;
/// the slug is locale-independent and ASCII-only so URLs are stable.
/// </summary>
public class Category
{
    public Guid Id { get; set; }

    /// <summary>Arabic display name. Required (RTL-first market).</summary>
    public string NameAr { get; set; } = string.Empty;

    /// <summary>English display name. Required (en is a first-class locale).</summary>
    public string NameEn { get; set; } = string.Empty;

    /// <summary>URL slug; ASCII lowercase-kebab; globally unique.</summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>Render order in nav menus. Lower = earlier. Ties broken by NameEn.</summary>
    public int DisplayOrder { get; set; }

    /// <summary>Soft-hide flag. Inactive categories are excluded from public listings.</summary>
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Navigation: products in this category.</summary>
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
