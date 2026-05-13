namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// One line in a <see cref="Cart"/>. Identified uniquely by the
/// (CartId, ProductVariantId) pair so adding the same variant twice
/// increments quantity rather than producing two rows.
/// </summary>
public class CartItem
{
    public Guid Id { get; set; }

    public Guid CartId { get; set; }
    public Cart? Cart { get; set; }

    /// <summary>The exact buyable SKU — Size × Color permutation.</summary>
    public Guid ProductVariantId { get; set; }
    public ProductVariant? ProductVariant { get; set; }

    /// <summary>1 ≤ Quantity ≤ 99 (enforced in validators, not at the schema level).</summary>
    public int Quantity { get; set; }

    /// <summary>
    /// Unit price snapshot in EGP at the moment the line was created/updated.
    /// Cart UI shows the *current* price; this is kept for forensics and a
    /// future "price changed since you added" affordance (M4+).
    /// </summary>
    public decimal UnitPriceSnapshot { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
