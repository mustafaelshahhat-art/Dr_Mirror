using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DrMirror.Api.Shared.ExceptionHandling;

/// <summary>
/// Converts <see cref="BadHttpRequestException"/> (thrown by the Minimal-API
/// parameter binder when a query/route value cannot be bound — e.g. an enum
/// query parameter with a value outside the enum) into an RFC 7807 400 response
/// instead of letting it bubble up as an unhandled 500.
/// </summary>
public sealed class BadHttpRequestExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not BadHttpRequestException badRequest)
        {
            return false;
        }

        var problem = new ProblemDetails
        {
            Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            Title = "Bad request",
            Status = StatusCodes.Status400BadRequest,
            Detail = badRequest.Message,
            Instance = httpContext.Request.Path,
        };

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;

        var pds = httpContext.RequestServices.GetService<IProblemDetailsService>();
        if (pds is not null)
        {
            await pds.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = httpContext,
                ProblemDetails = problem,
            });
            return true;
        }

        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken: cancellationToken);
        return true;
    }
}
