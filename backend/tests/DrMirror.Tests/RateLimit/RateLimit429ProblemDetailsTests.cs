using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DrMirror.Api.Features.Inquiries.Common;
using DrMirror.Tests.Infrastructure;

namespace DrMirror.Tests.RateLimit;

/// <summary>
/// Pins the 429 response shape so the SPA's shared isAxiosError&lt;ProblemDetails&gt;
/// path can parse rate-limit rejections like every other failure.
/// Inquiry submit is capped at 5 req/min; the 6th call must come back as RFC 7807.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class RateLimit429ProblemDetailsTests
    : IClassFixture<RateLimit429ProblemDetailsTests.Factory>
{
    private readonly Factory _factory;

    public RateLimit429ProblemDetailsTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Inquiry_submit_returns_problem_details_after_limit()
    {
        var client = _factory.CreateClient();

        SubmitInquiryRequest Payload(int n) => new(
            ProductId: null,
            FullName: $"Rate Limit Tester {n}",
            Email: $"rl{n}@example.com",
            Phone: null,
            Subject: "Stress",
            Message: "Repeated submission to exercise the rate limit.");

        // First 5 succeed within the window.
        for (int i = 0; i < 5; i++)
        {
            using var ok = await client.PostAsJsonAsync("/api/inquiries", Payload(i));
            Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        }

        using var rejected = await client.PostAsJsonAsync("/api/inquiries", Payload(99));
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.NotNull(rejected.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", rejected.Content.Headers.ContentType!.MediaType);

        await using var body = await rejected.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(body);
        var root = doc.RootElement;
        Assert.Equal(429, root.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("title").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("detail").GetString()));
        // traceId comes from CustomizeProblemDetails in Program.cs.
        Assert.True(root.TryGetProperty("traceId", out _));
    }

    public class Factory : IntegrationWebAppFactory
    {
    }
}
