using Serilog.Core;
using Serilog.Events;

namespace DrMirror.Api.Shared.Logging;

public sealed class SecretLogEventFilter : ILogEventFilter
{
    private static readonly string[] SensitiveTerms = ["password", "secret", "token", "apikey", "authorization", "cookie"];

    public bool IsEnabled(LogEvent logEvent)
    {
        var rendered = logEvent.RenderMessage();
        if (ContainsSensitiveTerm(rendered)) return false;

        foreach (var property in logEvent.Properties)
        {
            if (ContainsSensitiveTerm(property.Key) || ContainsSensitiveTerm(property.Value.ToString()))
                return false;
        }

        return true;
    }

    private static bool ContainsSensitiveTerm(string value) =>
        SensitiveTerms.Any(term => value.Contains(term, StringComparison.OrdinalIgnoreCase));
}
