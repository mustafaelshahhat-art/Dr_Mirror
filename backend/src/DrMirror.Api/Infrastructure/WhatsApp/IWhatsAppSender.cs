namespace DrMirror.Api.Infrastructure.WhatsApp;

public interface IWhatsAppSender
{
    Task SendAsync(string phone, string body, CancellationToken ct);
}
