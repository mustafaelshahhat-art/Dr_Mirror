namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// One ordered SKU on an <see cref="Order"/>. Every consumer-visible field is
/// captured as a snapshot at order time so historical orders remain truthful
/// after the underlying product / variant has been edited or disabled.
/// </summary>
public class OrderItem
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }
    public Order? Order { get; set; }

    /// <summary>
    /// FK to the parent product. Restricted on delete — products in order history
    /// can never be physically deleted, only deactivated.
    /// </summary>
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }

    /// <summary>
    /// FK to the specific buyable SKU. Restricted on delete for the same reason.
    /// </summary>
    public Guid ProductVariantId { get; set; }
    public ProductVariant? ProductVariant { get; set; }

    // -------- Snapshots (frozen at order creation) -----------------------------

    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string ColorName { get; set; } = string.Empty;
    public string ColorNameAr { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;

    /// <summary>Snapshot of the first/primary image at order time.</summary>
    public string? PrimaryImageUrl { get; set; }

    // -------- Pricing & quantity ----------------------------------------------

    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
