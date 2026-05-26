namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed record SidecarHealthResult(
    bool IsHealthy,
    DateTimeOffset LastCheckedAt,
    string? ErrorMessage);

public interface IWhatsAppHealthCache
{
    SidecarHealthResult? Latest { get; }
    void Update(SidecarHealthResult result);
}

public sealed class WhatsAppHealthCache : IWhatsAppHealthCache
{
    private volatile SidecarHealthResult? _latest;
    public SidecarHealthResult? Latest => _latest;
    public void Update(SidecarHealthResult result) => _latest = result;
}
