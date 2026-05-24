using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Utils;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Production SMTP email sender backed by MailKit. Activated by
/// <c>Email:Provider=mailkit</c>; reads SMTP host / port / credentials from
/// the same <see cref="EmailOptions"/> section.
/// </summary>
public sealed class MailKitEmailSender : IEmailSender
{
    private readonly EmailOptions _opts;
    private readonly ILogger<MailKitEmailSender> _logger;

    public MailKitEmailSender(IOptions<EmailOptions> opts, ILogger<MailKitEmailSender> logger)
    {
        _opts = opts.Value;
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_opts.SmtpHost))
        {
            throw new InvalidOperationException(
                "Email:Provider=mailkit but Email:SmtpHost is missing — configure SMTP or revert to Email:Provider=logonly.");
        }
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_opts.FromName, _opts.FromAddress));
        mime.ReplyTo.Add(MailboxAddress.Parse(string.IsNullOrWhiteSpace(_opts.ReplyToAddress)
            ? _opts.FromAddress
            : _opts.ReplyToAddress));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Date = DateTimeOffset.UtcNow;
        mime.MessageId = MimeUtils.GenerateMessageId(GetMessageIdDomain());
        mime.Headers.Add(HeaderId.AutoSubmitted, "auto-generated");
        mime.Headers.Add("X-Auto-Response-Suppress", "All");
        mime.Headers.Add("X-Entity-Ref-ID", Guid.NewGuid().ToString("N"));

        var builder = new BodyBuilder { TextBody = message.TextBody };
        if (!string.IsNullOrWhiteSpace(message.HtmlBody))
        {
            builder.HtmlBody = message.HtmlBody;
        }
        mime.Body = builder.ToMessageBody();

        using var client = new SmtpClient();
        client.Timeout = 15_000;
        var secureOption = _opts.SmtpUseStartTls
            ? SecureSocketOptions.StartTls
            : SecureSocketOptions.Auto;

        await client.ConnectAsync(_opts.SmtpHost!, _opts.SmtpPort, secureOption, ct);
        if (!string.IsNullOrWhiteSpace(_opts.SmtpUsername))
        {
            await client.AuthenticateAsync(_opts.SmtpUsername, _opts.SmtpPassword ?? "", ct);
        }
        await client.SendAsync(mime, ct);
        await client.DisconnectAsync(true, ct);

        _logger.LogInformation("Sent email to {To} subject={Subject}", message.To, message.Subject);
    }

    private string GetMessageIdDomain()
    {
        if (!string.IsNullOrWhiteSpace(_opts.MessageIdDomain))
            return _opts.MessageIdDomain.Trim();

        var atIndex = _opts.FromAddress.LastIndexOf('@');
        return atIndex >= 0 && atIndex < _opts.FromAddress.Length - 1
            ? _opts.FromAddress[(atIndex + 1)..]
            : "drmirror.shop";
    }
}
