using System.ComponentModel.DataAnnotations;

namespace DrMirror.Api.Infrastructure.Identity;

/// <summary>
/// Bound to the <c>Jwt</c> configuration section. All four fields are required;
/// validation runs at startup (see <c>builder.Services.AddOptions&lt;JwtOptions&gt;()</c>
/// in <c>Program.cs</c>).
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required, MinLength(1)]
    public string Issuer { get; init; } = string.Empty;

    [Required, MinLength(1)]
    public string Audience { get; init; } = string.Empty;

    /// <summary>HMAC signing key. Min 64 bytes (512 bits) for HS512; we use HS256 so 32+ is fine.</summary>
    [Required, MinLength(32)]
    public string Secret { get; init; } = string.Empty;

    /// <summary>Access-token lifetime. Default 15 minutes per architectural plan.</summary>
    [Range(1, 120)]
    public int AccessTokenLifetimeMinutes { get; init; } = 15;

    /// <summary>Refresh-token lifetime. Default 14 days per architectural plan.</summary>
    [Range(1, 60)]
    public int RefreshTokenLifetimeDays { get; init; } = 14;

    /// <summary>Refresh cookie name. Path-scoped to /api/auth.</summary>
    public string RefreshCookieName { get; init; } = "drmirror_refresh";

    /// <summary>Refresh cookie path. Restricting to /api/auth means the cookie is only
    /// transmitted to refresh/logout/login/register endpoints.</summary>
    public string RefreshCookiePath { get; init; } = "/api/auth";
}
