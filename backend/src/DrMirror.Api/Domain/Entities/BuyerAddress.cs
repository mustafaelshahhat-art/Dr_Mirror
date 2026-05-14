namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// A saved delivery address belonging to a buyer. Used to pre-fill checkout
/// without re-typing. Orders snapshot the address inline (owned VO on Order)
/// so deleting a <c>BuyerAddress</c> never breaks historical orders.
/// </summary>
public class BuyerAddress
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Free-form label shown in the picker (e.g. "Home", "Work", "Mum's house"). Max 64.</summary>
    public string Label { get; set; } = string.Empty;

    public string RecipientName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    /// <summary>Canonical governorate slug — see <see cref="DrMirror.Api.Domain.Catalog.Governorates"/>.</summary>
    public string Governorate { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;
    public string StreetAddress { get; set; } = string.Empty;

    public string? Floor { get; set; }
    public string? Apartment { get; set; }
    public string? Landmark { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// At most one address per user has <c>IsDefault=true</c>. Endpoints enforce
    /// this invariant by clearing the flag on siblings inside the same
    /// SaveChanges call.
    /// </summary>
    public bool IsDefault { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
