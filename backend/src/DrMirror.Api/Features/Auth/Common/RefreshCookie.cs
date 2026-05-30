using DrMirror.Api.Infrastructure.Identity;
using Microsoft.AspNetCore.Http;

namespace DrMirror.Api.Features.Auth.Common;

/// <summary>
/// Encapsulates set/clear semantics for the refresh-token cookie so every
/// endpoint hands off identical cookie flags. Cookie attributes:
///   - HttpOnly        → JS cannot read it.
///   - Secure          → HTTPS-only in production; permitted on http://localhost in dev.
///   - SameSite        → Auto-detected: same-origin → Lax, cross-origin → None.
///                       When frontend and backend share an origin (Vite proxy in dev,
///                       Vercel rewrites in prod), SameSite=Lax works everywhere,
///                       including mobile browsers that block SameSite=None cookies.
///   - Path=/api/auth  → cookie is only transmitted to the auth slice.
/// </summary>
public sealed class RefreshCookieWriter
{
    private readonly JwtOptions _jwt;
    private readonly bool _isProduction;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RefreshCookieWriter(JwtOptions jwt, IHostEnvironment env, IHttpContextAccessor httpContextAccessor)
    {
        _jwt = jwt;
        _isProduction = env.IsProduction();
        _httpContextAccessor = httpContextAccessor;
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

    private CookieOptions BuildOptions(DateTimeOffset expiresAt)
    {
        var sameSite = ResolveSameSiteMode();
        return new()
        {
            HttpOnly = true,
            Secure = _isProduction || sameSite == SameSiteMode.None,
            SameSite = sameSite,
            Path = _jwt.RefreshCookiePath,
            Expires = expiresAt,
            IsEssential = true,
        };
    }

    private SameSiteMode ResolveSameSiteMode()
    {
        var request = _httpContextAccessor.HttpContext?.Request;
        if (request is null) return SameSiteMode.Lax;

        var origin = request.Headers.Origin.ToString();
        if (string.IsNullOrEmpty(origin)) return SameSiteMode.Lax;

        try
        {
            var originUri = new Uri(origin);
            var isSameOrigin = string.Equals(originUri.Host, request.Host.Host, StringComparison.OrdinalIgnoreCase)
                            && string.Equals(originUri.Scheme, request.Scheme, StringComparison.OrdinalIgnoreCase);
            return isSameOrigin ? SameSiteMode.Lax : SameSiteMode.None;
        }
        catch
        {
            return SameSiteMode.None;
        }
    }
}
