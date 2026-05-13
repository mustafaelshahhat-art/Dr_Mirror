using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;

namespace DrMirror.Api.Features.Auth.Common;

/// <summary>
/// Single source of truth for issuing a refresh token + persisting its hash.
/// All three success-path endpoints (Register / Login / Refresh) go through
/// here so the rotation chain stays consistent.
/// </summary>
public sealed class RefreshTokenIssuer
{
    private readonly IJwtTokenService _jwt;
    private readonly AppDbContext _db;

    public RefreshTokenIssuer(IJwtTokenService jwt, AppDbContext db)
    {
        _jwt = jwt;
        _db = db;
    }

    /// <summary>
    /// Mint a new refresh token for <paramref name="userId"/>, persist its hash,
    /// and return the raw token string (which the caller writes into the cookie).
    /// </summary>
    public async Task<RefreshTokenResult> IssueAsync(
        Guid userId,
        string? createdByIp,
        CancellationToken ct)
    {
        var minted = _jwt.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = minted.TokenHash,
            ExpiresAt = minted.ExpiresAt,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByIp = createdByIp,
        });

        await _db.SaveChangesAsync(ct);
        return minted;
    }

    /// <summary>
    /// Rotation: revoke <paramref name="current"/>, persist a successor, return the new raw token.
    /// </summary>
    public async Task<RefreshTokenResult> RotateAsync(
        RefreshToken current,
        string? rotatedByIp,
        CancellationToken ct)
    {
        var minted = _jwt.CreateRefreshToken();
        var now = DateTimeOffset.UtcNow;

        current.RevokedAt = now;
        current.RevokedByIp = rotatedByIp;
        current.ReplacedByTokenHash = minted.TokenHash;

        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = current.UserId,
            TokenHash = minted.TokenHash,
            ExpiresAt = minted.ExpiresAt,
            CreatedAt = now,
            CreatedByIp = rotatedByIp,
        });

        await _db.SaveChangesAsync(ct);
        return minted;
    }
}
