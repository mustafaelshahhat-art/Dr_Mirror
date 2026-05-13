namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// An owned value-object stored inline on <c>Order</c>. Captures everything we
/// need to dispatch a parcel inside Egypt. Saved-address books (multiple
/// addresses per user, default-address picker) are deferred to M4.
/// </summary>
/// <remarks>
/// Free-string <c>Governorate</c> in V1; M4 may tighten this to the canonical
/// 27-governorate enum once the admin UX is in place.
/// </remarks>
public class ShippingAddress
{
    /// <summary>Display name to show on the parcel.</summary>
    public string RecipientName { get; set; } = string.Empty;

    /// <summary>Reachable phone number (Egyptian mobile or land line).</summary>
    public string Phone { get; set; } = string.Empty;

    /// <summary>Egyptian governorate (e.g. "Cairo" / "القاهرة").</summary>
    public string Governorate { get; set; } = string.Empty;

    /// <summary>City or district.</summary>
    public string City { get; set; } = string.Empty;

    /// <summary>Street + building number.</summary>
    public string StreetAddress { get; set; } = string.Empty;

    public string? Floor { get; set; }
    public string? Apartment { get; set; }

    /// <summary>Optional landmark to help the courier (e.g. "Beside Carrefour").</summary>
    public string? Landmark { get; set; }

    /// <summary>Optional notes the buyer wants on the parcel ("Ring twice", etc.).</summary>
    public string? Notes { get; set; }
}
