using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;

namespace DrMirror.Api.Shared.Validation;

/// <summary>
/// Minimal-API endpoint filter that runs the FluentValidation validator for
/// the first argument of type <typeparamref name="T"/> in the endpoint
/// signature. On failure it returns an RFC 7807
/// <c>ValidationProblemDetails</c> (HTTP 400) — exactly the same shape we'd
/// get from MVC's <c>[ApiController]</c> auto-validation.
/// </summary>
/// <remarks>
/// Wire with <c>.AddEndpointFilter&lt;ValidationFilter&lt;LoginRequest&gt;&gt;()</c>.
/// </remarks>
public sealed class ValidationFilter<T> : IEndpointFilter where T : class
{
    private readonly IValidator<T> _validator;

    public ValidationFilter(IValidator<T> validator)
    {
        _validator = validator;
    }

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var arg = context.Arguments.OfType<T>().FirstOrDefault();
        if (arg is null)
        {
            // Programmer error — endpoint wired up with wrong filter type.
            return Results.Problem(
                title: "Validation could not run",
                detail: $"Endpoint filter expected an argument of type {typeof(T).Name} but none was bound.",
                statusCode: StatusCodes.Status500InternalServerError);
        }

        var result = await _validator.ValidateAsync(arg, context.HttpContext.RequestAborted);
        if (result.IsValid) return await next(context);

        // Group failures by property: { propertyName: [error1, error2], ... }
        var errors = result.Errors
            .GroupBy(f => f.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(f => f.ErrorMessage).ToArray());

        return TypedResults.ValidationProblem(
            errors: errors,
            title: "One or more validation errors occurred.",
            type: "https://datatracker.ietf.org/doc/html/rfc7807#section-3.1");
    }
}
