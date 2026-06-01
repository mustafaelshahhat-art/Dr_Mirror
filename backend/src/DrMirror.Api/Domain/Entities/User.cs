using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// Application user. Extends <see cref="IdentityUser{Guid}"/> with the few
/// product-domain fields we need at M1. Anything that doesn't logically
/// belong to "identity" (addresses, phone numbers, KYC, etc.) lives on
/// separate aggregates and is introduced in later milestones.
/// </summary>
public class User : IdentityUser<Guid>
{
    /// <summary>Display name, shown across the UI. 2–120 chars, required at signup.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>UTC creation timestamp, set on <see cref="Microsoft.AspNetCore.Identity.UserManager{TUser}.CreateAsync(TUser, string)"/>.</summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>UTC last-modified timestamp. Bumped on profile mutations.</summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Soft-disable flag. When true, login is refused even with valid credentials.</summary>
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Preferred language for customer-facing notifications: <c>"en"</c> (default) or
    /// <c>"ar"</c>. Captured from the active UI locale at register/checkout and used to
    /// render emails and WhatsApp messages — including admin-triggered ones — in the
    /// customer's own language.
    /// </summary>
    public string Language { get; set; } = "en";

    /// <summary>Navigation: outstanding refresh tokens for this user (one row per device/session).</summary>
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
