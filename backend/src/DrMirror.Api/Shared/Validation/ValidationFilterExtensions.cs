namespace DrMirror.Api.Shared.Validation;

/// <summary>
/// Sugar for wiring a <see cref="ValidationFilter{T}"/> onto an endpoint.
/// Constrain to <see cref="RouteHandlerBuilder"/> because that's the only
/// builder we attach single-endpoint filters to (group-level filters use
/// a different API on <see cref="RouteGroupBuilder"/>).
/// </summary>
public static class ValidationFilterExtensions
{
    public static RouteHandlerBuilder WithValidation<TRequest>(this RouteHandlerBuilder builder)
        where TRequest : class
    {
        builder.AddEndpointFilter<ValidationFilter<TRequest>>();
        return builder;
    }
}
