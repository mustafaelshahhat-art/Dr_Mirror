using DrMirror.Api.Infrastructure.Identity;

namespace DrMirror.Api.Features.Auth.Common;

/// <summary>
/// Encapsulates set/clear semantics for the refresh-token cookie so every
/// endpoint hands off identical cookie flags. Cookie attributes:
///   - HttpOnly        → JS cannot read it.
///   - Secure          → HTTPS-only in production; permitted on http://localhost in dev.
///   - SameSite=Lax    → fine when frontend + backend share an origin via Vite proxy.
///                       In prod (cross-origin Vercel ⇄ MonsterASP) the deployment
///                       MUST set <see cref="UseCrossSiteCookies"/>=true → SameSite=None.
///   - Path=/api/auth  → cookie is only transmitted to the auth slice.
/// </summary>
public sealed class RefreshCookieWriter
{
    private readonly JwtOptions _jwt;
    private readonly bool _isProduction;
    private readonly bool _useCrossSiteCookies;

    public RefreshCookieWriter(JwtOptions jwt, IHostEnvironment env, IConfiguration config)
    {
        _jwt = jwt;
        _isProduction = env.IsProduction();
        // Override knob for prod: set Auth__UseCrossSiteCookies=true when SPA is on
        // a different origin than the API. Defaults to false (same-origin/proxy).
        _useCrossSiteCookies = config.GetValue<bool>("Auth:UseCrossSiteCookies");
    }

    public void Write(HttpResponse response, string rawToken, DateTimeOffset expiresAt)
    {
        var options = BuildOptions(expiresAt);
        response.Cookies.Append(_jwt.RefreshCookieName, rawToken, options);
    }

    public void Clear(HttpResponse response)
    {
        var options = BuildOptions(DateTimeOffset.UtcNow.AddDays(-1));
        response.Cookies.Delete(_jwt.RefreshCookieName, options);
    }

    public string? Read(HttpRequest request)
    {
        return request.Cookies.TryGetValue(_jwt.RefreshCookieName, out var raw) ? raw : null;
    }

    private CookieOptions BuildOptions(DateTimeOffset expiresAt) => new()
    {
        HttpOnly = true,
        Secure = _isProduction || _useCrossSiteCookies,
        SameSite = _useCrossSiteCookies ? SameSiteMode.None : SameSiteMode.Lax,
        Path = _jwt.RefreshCookiePath,
        Expires = expiresAt,
        IsEssential = true,
    };
}
