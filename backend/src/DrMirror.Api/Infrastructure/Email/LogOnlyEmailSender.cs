using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Dev-friendly email sender that emits the message at <c>Information</c> level
/// instead of sending it. Use this in development and CI; flip to
/// <see cref="MailKitEmailSender"/> for staging/prod.
/// </summary>
public sealed class LogOnlyEmailSender : IEmailSender
{
    private readonly ILogger<LogOnlyEmailSender> _logger;
    private readonly EmailOptions _opts;

    public LogOnlyEmailSender(ILogger<LogOnlyEmailSender> logger, IOptions<EmailOptions> opts)
    {
        _logger = logger;
        _opts = opts.Value;
    }

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[email] to={To} from={From} subject={Subject}\n----\n{Body}\n----",
            message.To,
            $"{_opts.FromName} <{_opts.FromAddress}>",
            message.Subject,
            message.TextBody);
        return Task.CompletedTask;
    }
}
