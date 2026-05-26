namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppPermanentFailureException(string reason) : Exception(reason)
{
    public string Reason { get; } = reason;
}
