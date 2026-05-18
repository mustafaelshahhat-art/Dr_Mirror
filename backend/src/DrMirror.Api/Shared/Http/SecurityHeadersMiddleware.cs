using Microsoft.Extensions.Options;

namespace DrMirror.Api.Shared.Http;

/// <summary>
/// Attaches the baseline security headers to every response. Hooks
/// <see cref="HttpResponse.OnStarting(Func{Task})"/> so the headers are written
/// before any handler flushes the response body — works for
/// <c>Results.Stream(...)</c> and <c>WriteAsync</c> alike.
///
/// HSTS is emitted only on production HTTPS responses (RFC 6797 §7.2).
/// </summary>
public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SecurityHeadersOptions _options;
    private readonly IHostEnvironment _env;

    public SecurityHeadersMiddleware(
        RequestDelegate next,
        IOptions<SecurityHeadersOptions> options,
        IHostEnvironment env)
    {
        _next = next;
        _options = options.Value;
        _env = env;
    }

    public Task InvokeAsync(HttpContext context)
    {
        if (!_options.EmitInDevelopment && _env.IsDevelopment())
        {
            return _next(context);
        }

        context.Response.OnStarting(static state =>
        {
            var (ctx, opts, env) = ((HttpContext, SecurityHeadersOptions, IHostEnvironment))state;
            var headers = ctx.Response.Headers;

            // Non-HSTS headers — emitted on every response.
            headers["X-Content-Type-Options"] = opts.ContentTypeOptions;
            headers["Referrer-Policy"] = opts.ReferrerPolicy;
            headers["X-Frame-Options"] = opts.FrameOptions;
            headers["Cross-Origin-Resource-Policy"] = opts.CrossOriginResourcePolicy;

            // HSTS — only over HTTPS in non-Development environments (or when
            // EmitHstsOnlyOverHttps is explicitly disabled).
            var emitHsts = !opts.EmitHstsOnlyOverHttps || ctx.Request.IsHttps;
            if (emitHsts && !env.IsDevelopment())
            {
                var hsts = $"max-age={opts.HstsMaxAge}";
                if (opts.HstsIncludeSubDomains) hsts += "; includeSubDomains";
                if (opts.HstsPreload) hsts += "; preload";
                headers["Strict-Transport-Security"] = hsts;
            }

            return Task.CompletedTask;
        }, (context, _options, _env));

        return _next(context);
    }
}
