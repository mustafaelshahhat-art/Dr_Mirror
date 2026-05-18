using Xunit;

namespace DrMirror.Tests.Security;

/// <summary>
/// Shared assertion helper — asserts the five baseline security headers from
/// the May 2026 audit hardening pass are present on a response. Consumed by
/// <c>SecurityHeadersTests</c> and any other suite that touches a response we
/// want to keep in compliance.
/// </summary>
public static class SecurityHeadersAssertions
{
    /// <summary>
    /// Asserts the four always-on headers (CTO, Referrer-Policy, Frame-Options,
    /// CORP) are present. HSTS is verified separately because it is conditional
    /// on HTTPS + non-Development environment.
    /// </summary>
    public static void AssertBaselineHeaders(HttpResponseMessage response)
    {
        AssertHeader(response, "X-Content-Type-Options", "nosniff");
        AssertHeader(response, "Referrer-Policy", "strict-origin-when-cross-origin");
        AssertHeader(response, "X-Frame-Options", "DENY");
        AssertHeader(response, "Cross-Origin-Resource-Policy", "same-site");
    }

    public static void AssertHsts(HttpResponseMessage response, bool expectPresent)
    {
        var present = response.Headers.Contains("Strict-Transport-Security");
        Assert.Equal(expectPresent, present);
    }

    private static void AssertHeader(HttpResponseMessage response, string name, string expected)
    {
        IEnumerable<string>? values = null;
        var found = response.Headers.TryGetValues(name, out values)
                    || response.Content.Headers.TryGetValues(name, out values);
        Assert.True(found, $"Expected header '{name}' on response, but none found.");
        var actual = values!.FirstOrDefault();
        Assert.Equal(expected, actual);
    }
}
