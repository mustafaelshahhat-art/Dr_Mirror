namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Outbound transactional email. Two implementations:
/// <list type="bullet">
///   <item><see cref="LogOnlyEmailSender"/> — dev default; writes the message to Serilog at Info.</item>
///   <item><see cref="MailKitEmailSender"/> — prod; SMTP via MailKit, behind <c>Email:Provider=mailkit</c>.</item>
/// </list>
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

public sealed record EmailMessage(
    string To,
    string Subject,
    string TextBody,
    string? HtmlBody = null);
