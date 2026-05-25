using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppSidecarMonitor : BackgroundService
{
    private readonly WhatsAppOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WhatsAppSidecarMonitor> _logger;

    public WhatsAppSidecarMonitor(
        IOptions<WhatsAppOptions> options,
        IServiceScopeFactory scopeFactory,
        ILogger<WhatsAppSidecarMonitor> logger)
    {
        _options = options.Value;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("WhatsApp external service integration is disabled.");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var client = scope.ServiceProvider.GetRequiredService<WhatsAppServiceClient>();
                var healthy = await client.HealthAsync(stoppingToken);
                if (!healthy)
                {
                    _logger.LogWarning("WhatsApp external service health check failed for {ServiceUrl}", _options.ServiceUrl);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "WhatsApp external service monitor failed. API will continue.");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
