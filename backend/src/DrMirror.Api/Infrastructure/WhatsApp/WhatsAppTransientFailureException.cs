namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppTransientFailureException(string reason) : Exception(reason)
{
    public string Reason { get; } = reason;
}
