namespace DrMirror.Api.Shared.Http;

/// <summary>
/// Strongly-typed configuration for <see cref="SecurityHeadersMiddleware"/>.
/// Bound from the <c>Security:Headers</c> section. See <c>data-model.md §2</c>
/// of the May 2026 audit hardening pass for the per-field rationale.
/// </summary>
public sealed class SecurityHeadersOptions
{
    public string HstsMaxAge { get; set; } = "31536000";
    public bool HstsIncludeSubDomains { get; set; } = true;
    public bool HstsPreload { get; set; } = false;
    public string ContentTypeOptions { get; set; } = "nosniff";
    public string ReferrerPolicy { get; set; } = "strict-origin-when-cross-origin";
    public string FrameOptions { get; set; } = "DENY";
    public string CrossOriginResourcePolicy { get; set; } = "cross-origin";
    public bool EmitInDevelopment { get; set; } = true;
    public bool EmitHstsOnlyOverHttps { get; set; } = true;
}
