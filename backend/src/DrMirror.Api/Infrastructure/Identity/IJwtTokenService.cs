using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Infrastructure.Identity;

/// <summary>The pair returned by an access-token mint.</summary>
public sealed record AccessTokenResult(string Token, DateTimeOffset ExpiresAt);

/// <summary>The pair returned by a refresh-token mint. <see cref="RawToken"/> is sent
/// to the client (cookie); the persisted hash lives on the <see cref="Domain.Entities.RefreshToken"/> row.</summary>
public sealed record RefreshTokenResult(string RawToken, string TokenHash, DateTimeOffset ExpiresAt);

public interface IJwtTokenService
{
    /// <summary>Mint a signed JWT access token with sub, email, role claims.</summary>
    AccessTokenResult CreateAccessToken(User user, IEnumerable<string> roles);

    /// <summary>Mint a fresh cryptographically random refresh token. Caller persists the hash.</summary>
    RefreshTokenResult CreateRefreshToken();

    /// <summary>SHA-256 hash a refresh-token string. Used to look up persisted rows on validation.</summary>
    string HashRefreshToken(string rawToken);
}
