namespace DrMirror.Api.Shared.RateLimiting;

/// <summary>
/// Named rate-limit policy keys. Centralised here so endpoints and
/// Program.cs never spell the same string twice.
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>
    /// Strict auth actions: login and register.
    /// 10 requests per minute per IP — sliding window.
    /// Exceeding returns 429 Too Many Requests.
    /// </summary>
    public const string AuthStrict = "auth-strict";

    /// <summary>
    /// Token refresh. Higher limit because SPAs refresh silently on every
    /// tab focus. 30 requests per minute per IP — sliding window.
    /// </summary>
    public const string AuthRefresh = "auth-refresh";

    /// <summary>
    /// Public inquiry submission — prevents contact-form spam.
    /// 5 requests per minute per IP — fixed window.
    /// </summary>
    public const string InquirySubmit = "inquiry-submit";

    /// <summary>
    /// Admin API endpoints — defense-in-depth for compromised accounts.
    /// 120 requests per minute per authenticated user — fixed window.
    /// </summary>
    public const string AdminApi = "admin-api";
}
