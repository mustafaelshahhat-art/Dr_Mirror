using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// Application user. Extends <see cref="IdentityUser{Guid}"/> with the few
/// product-domain fields we need at M1.
/// </summary>
public class User : IdentityUser<Guid>
{
    /// <summary>Display name, shown across the UI. 2–120 chars, required at signup.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>UTC creation timestamp, set on <see cref="Microsoft.AspNetCore.Identity.UserManager{TUser}.CreateAsync(TUser, string)"/>.</summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>UTC last-modified timestamp. Bumped on profile mutations.</summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>UTC timestamp when the current phone number was last verified.</summary>
    public DateTimeOffset? PhoneVerifiedAt { get; set; }

    /// <summary>Soft-disable flag. When true, login is refused even with valid credentials.</summary>
    public bool IsDisabled { get; set; }

    /// <summary>Navigation: outstanding refresh tokens for this user (one row per device/session).</summary>
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
