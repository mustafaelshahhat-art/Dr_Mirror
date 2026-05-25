namespace DrMirror.Api.Infrastructure.WhatsApp;

using DrMirror.Api.Domain.Entities;

public interface IWhatsAppSender
{
    Task SendAsync(string phone, string body, CancellationToken ct) =>
        SendAsync(phone, body, WhatsAppMessagePriority.Normal, ct);

    Task SendAsync(string phone, string body, WhatsAppMessagePriority priority, CancellationToken ct);
}
