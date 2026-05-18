using DrMirror.Api.Features.Auth.Refresh;

namespace DrMirror.Tests.Security;

public class RefreshOriginPolicyTests
{
    [Fact]
    public void Accepts_exact_match_case_insensitive()
    {
        var allowlist = new[] { "https://app.example.com" };
        var verdict = RefreshOriginPolicy.Evaluate("https://APP.example.com", allowlist);
        Assert.Equal(RefreshOriginVerdict.Accept, verdict);
    }

    [Fact]
    public void Accepts_exact_match_when_multiple_origins_allowlisted()
    {
        var allowlist = new[] { "https://staging.example.com", "https://app.example.com" };
        var verdict = RefreshOriginPolicy.Evaluate("https://app.example.com", allowlist);
        Assert.Equal(RefreshOriginVerdict.Accept, verdict);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_missing_or_blank_origin(string? origin)
    {
        var verdict = RefreshOriginPolicy.Evaluate(origin, new[] { "https://app.example.com" });
        Assert.Equal(RefreshOriginVerdict.Reject_MissingOrigin, verdict);
    }

    [Fact]
    public void Rejects_unknown_origin()
    {
        var verdict = RefreshOriginPolicy.Evaluate(
            "https://evil.example.com",
            new[] { "https://app.example.com" });
        Assert.Equal(RefreshOriginVerdict.Reject_UnknownOrigin, verdict);
    }

    [Fact]
    public void Rejects_when_allowlist_is_empty()
    {
        var verdict = RefreshOriginPolicy.Evaluate(
            "https://app.example.com",
            Array.Empty<string>());
        Assert.Equal(RefreshOriginVerdict.Reject_UnknownOrigin, verdict);
    }
}
