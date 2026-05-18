namespace DrMirror.Api.Shared.ExternalServices;

public sealed class ExternalServiceUnavailableException : Exception
{
    public ExternalServiceUnavailableException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
