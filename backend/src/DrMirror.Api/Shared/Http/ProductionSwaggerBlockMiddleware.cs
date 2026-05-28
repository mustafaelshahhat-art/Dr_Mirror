namespace DrMirror.Api.Shared.Http;

public sealed class ProductionSwaggerBlockMiddleware
{
    private static readonly string[] SwaggerPaths = ["/swagger", "/swagger/index.html", "/swagger/v1/swagger.json", "/swagger/v1/openapi.json"];

    private readonly RequestDelegate _next;

    public ProductionSwaggerBlockMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        if (SwaggerPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return Task.CompletedTask;
        }

        return _next(context);
    }
}
