namespace DrMirror.Api.Shared.Localization;

/// <summary>
/// Resolves the language used for a customer-facing notification. Two-locale
/// system: <c>"en"</c> (app default) and <c>"ar"</c>. New users default to
/// English unless they actively choose Arabic.
/// </summary>
public static class NotificationLanguage
{
    /// <summary>App default language. New visitors/users are English until they choose Arabic.</summary>
    public const string Default = "en";

    /// <summary>
    /// Normalize an arbitrary language tag (e.g. <c>"ar"</c>, <c>"ar-EG"</c>, <c>"en-US"</c>,
    /// <c>null</c>) to one of the two supported values. Anything that is not Arabic
    /// falls back to the English default.
    /// </summary>
    public static string Normalize(string? language) =>
        !string.IsNullOrWhiteSpace(language)
        && language.Trim().StartsWith("ar", StringComparison.OrdinalIgnoreCase)
            ? "ar"
            : Default;

    /// <summary>
    /// Resolve the language from the request's <c>Accept-Language</c> header. The SPA
    /// sets this header to the <b>active UI locale</b> on every call, so a manual
    /// language switch is reflected here even when it differs from the browser locale.
    /// Falls back to the English default when the header is absent or unsupported.
    /// </summary>
    public static string FromRequest(HttpContext http)
    {
        var firstTag = http.Request.Headers.AcceptLanguage.ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault();

        return Normalize(firstTag);
    }
}
