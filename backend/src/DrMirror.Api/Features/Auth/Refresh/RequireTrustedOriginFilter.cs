namespace DrMirror.Api.Features.Auth.Refresh;

/// <summary>
/// Pipeline middleware that rejects POST /api/auth/refresh requests whose
/// <c>Origin</c> header is missing or does not match the configured CORS
/// allowlist. Registered <em>before</em> <c>UseRateLimiter()</c> so a forged
/// refresh never consumes a rate-limit budget slot.
/// </summary>
internal sealed class RequireTrustedOriginMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;

    public RequireTrustedOriginMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        var isRefresh = HttpMethods.IsPost(context.Request.Method)
                        && path.HasValue
                        && path.Value!.EndsWith("/auth/refresh", StringComparison.OrdinalIgnoreCase);

        if (!isRefresh)
        {
            await _next(context);
            return;
        }

        var origin = context.Request.Headers.Origin.ToString();
        var allowlist = _configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();

        var verdict = RefreshOriginPolicy.Evaluate(
            string.IsNullOrEmpty(origin) ? null : origin,
            allowlist);

        if (verdict != RefreshOriginVerdict.Accept)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsync(
                "{\"title\":\"Forbidden\",\"status\":403," +
                "\"detail\":\"Refresh requests must originate from a trusted browser surface.\"}",
                context.RequestAborted);
            return;
        }

        await _next(context);
    }
}
