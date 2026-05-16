using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DrMirror.Api.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DrMirror.Api.Infrastructure.Identity;

/// <summary>
/// Issues JWT access tokens (HS256, short-lived) and cryptographically random
/// refresh tokens (256-bit raw, SHA-256 hash persisted). Pure: no DB access,
/// no HTTP context. Callers wire it into the refresh-token store.
/// </summary>
public sealed class JwtTokenService : IJwtTokenService
{
    public const string SecurityStampClaimType = "sst";

    private readonly JwtOptions _options;
    private readonly SigningCredentials _signingCredentials;
    private readonly JwtSecurityTokenHandler _handler = new();

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        var keyBytes = Encoding.UTF8.GetBytes(_options.Secret);
        var key = new SymmetricSecurityKey(keyBytes);
        _signingCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    }

    public AccessTokenResult CreateAccessToken(User user, IEnumerable<string> roles)
    {
        var now = DateTimeOffset.UtcNow;
        var expires = now.AddMinutes(_options.AccessTokenLifetimeMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(JwtRegisteredClaimNames.Iat,
                now.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
            new("name", user.FullName),
            new(SecurityStampClaimType, user.SecurityStamp ?? string.Empty),
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expires.UtcDateTime,
            signingCredentials: _signingCredentials);

        var jwt = _handler.WriteToken(token);
        return new AccessTokenResult(jwt, expires);
    }

    public RefreshTokenResult CreateRefreshToken()
    {
        // 256 bits of entropy → 32 raw bytes → 43-char base64url string.
        Span<byte> buffer = stackalloc byte[32];
        RandomNumberGenerator.Fill(buffer);
        var raw = Base64UrlEncode(buffer);

        var hash = HashRefreshToken(raw);
        var expires = DateTimeOffset.UtcNow.AddDays(_options.RefreshTokenLifetimeDays);
        return new RefreshTokenResult(raw, hash, expires);
    }

    public string HashRefreshToken(string rawToken)
    {
        var bytes = Encoding.UTF8.GetBytes(rawToken);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash); // 64 uppercase hex chars
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> bytes)
    {
        // Standard URL-safe base64 (RFC 4648 §5) without padding.
        var s = Convert.ToBase64String(bytes);
        return s.TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
