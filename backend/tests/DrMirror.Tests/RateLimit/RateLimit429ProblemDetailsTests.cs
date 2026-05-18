using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DrMirror.Api.Features.Inquiries.Common;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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

    [Fact]
    public async Task Payment_proof_upload_returns_problem_details_after_limit()
    {
        var callerId = Guid.NewGuid();
        var client = MakeAuthenticatedClient(callerId);

        // Proof-upload policy: 10 req/5 min per user. The endpoint expects
        // multipart (IFormFile) so we send a POST with null body — the rate
        // limiter runs before the handler and counts every request.
        for (int i = 0; i < 10; i++)
        {
            using var ok = await client.PostAsync("/api/orders/DM-NONEXISTENT/proof", null);
        }

        using var rejected = await client.PostAsync("/api/orders/DM-NONEXISTENT/proof", null);
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.NotNull(rejected.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", rejected.Content.Headers.ContentType!.MediaType);

        await using var body = await rejected.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(body);
        var root = doc.RootElement;
        Assert.Equal(429, root.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("title").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("detail").GetString()));
        Assert.True(root.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task Payment_proof_file_read_returns_problem_details_after_limit()
    {
        var client = _factory.CreateClient();

        // Proof-file-read policy: 60 req/1 min per IP (sliding). Burn through the budget.
        for (int i = 0; i < 60; i++)
        {
            using var ok = await client.GetAsync(
                "/api/orders/DM-NONEXISTENT/proof/00000000-0000-0000-0000-000000000000/file");
        }

        using var rejected = await client.GetAsync(
            "/api/orders/DM-NONEXISTENT/proof/00000000-0000-0000-0000-000000000000/file");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.NotNull(rejected.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", rejected.Content.Headers.ContentType!.MediaType);

        await using var body = await rejected.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(body);
        var root = doc.RootElement;
        Assert.Equal(429, root.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("title").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("detail").GetString()));
        Assert.True(root.TryGetProperty("traceId", out _));
    }

    private HttpClient MakeAuthenticatedClient(Guid userId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("RateLimitTest")
                 .AddScheme<AuthenticationSchemeOptions, RateLimitTestAuthHandler>(
                     "RateLimitTest", _ => { });
                s.AddSingleton(new RateLimitTestCaller(userId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("RateLimitTest");
        return client;
    }

    public class Factory : IntegrationWebAppFactory
    {
    }
}

public sealed class RateLimitTestCaller
{
    public Guid UserId { get; }
    public RateLimitTestCaller(Guid userId) => UserId = userId;
}

public sealed class RateLimitTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly RateLimitTestCaller _caller;

    public RateLimitTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        RateLimitTestCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString())],
            "RateLimitTest");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "RateLimitTest");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
