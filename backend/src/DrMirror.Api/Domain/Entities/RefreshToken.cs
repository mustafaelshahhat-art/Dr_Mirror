namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// Persisted refresh-token record. The raw token (256-bit random) is sent to
/// the client as an httpOnly cookie; only its SHA-256 hash is stored here.
///
/// Rotation invariant: every time a refresh token is used, this row is marked
/// <see cref="RevokedAt"/>, a new <see cref="RefreshToken"/> row is created,
/// and the new hash is recorded in <see cref="ReplacedByTokenHash"/> so the
/// rotation chain is auditable.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    /// <summary>SHA-256 hash (64 hex chars) of the raw refresh token. Indexed unique.</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>Absolute UTC expiry. Default is created-at + Jwt:RefreshTokenLifetimeDays.</summary>
    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Set when the token is revoked (rotation, explicit logout, or admin invalidation).</summary>
    public DateTimeOffset? RevokedAt { get; set; }

    /// <summary>Hash of the token that replaced this one. Only set on rotation.</summary>
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>Originating IP (peer endpoint), for forensics. Not used for validation.</summary>
    public string? CreatedByIp { get; set; }

    /// <summary>IP that revoked the token (the next-rotation client, or the logout client).</summary>
    public string? RevokedByIp { get; set; }

    // Navigation
    public User? User { get; set; }

    /// <summary>Convenience: token still valid for refresh use right now.</summary>
    public bool IsActive => RevokedAt is null && DateTimeOffset.UtcNow < ExpiresAt;
}
