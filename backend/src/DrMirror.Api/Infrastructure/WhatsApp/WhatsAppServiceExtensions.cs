using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public static class WhatsAppServiceExtensions
{
    public static IServiceCollection AddWhatsAppServices(this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<WhatsAppOptions>()
            .Bind(config.GetSection(WhatsAppOptions.SectionName))
            .Validate(options => !options.Enabled || !string.IsNullOrWhiteSpace(options.ServiceUrl), "WhatsApp:ServiceUrl is required when WhatsApp is enabled.")
            .Validate(options => !options.Enabled || !string.IsNullOrWhiteSpace(options.InternalApiKey), "WhatsApp:InternalApiKey is required when WhatsApp is enabled.")
            .Validate(options => options.TimeoutSeconds > 0, "WhatsApp:TimeoutSeconds must be positive.")
            .Validate(options => options.MaxAttempts >= 2, "WhatsApp:MaxAttempts must be at least 2 (circuit-open exemption requires a minimum of 2 claimable slots).")
            .ValidateOnStart();

        services.AddSingleton<IWhatsAppHealthCache, WhatsAppHealthCache>();

        services.AddHttpClient<WhatsAppServiceClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<WhatsAppOptions>>().Value;
            if (!string.IsNullOrWhiteSpace(options.ServiceUrl))
            {
                client.BaseAddress = new Uri(options.ServiceUrl.TrimEnd('/'));
            }
            client.Timeout = Timeout.InfiniteTimeSpan;
        });
        services.AddScoped<IWhatsAppSender>(sp => sp.GetRequiredService<WhatsAppServiceClient>());
        services.AddScoped<WhatsAppMessageDispatcher>();
        services.AddHostedService<WhatsAppOutboxProcessor>();
        services.AddHostedService<WhatsAppSidecarMonitor>();
        services.AddHostedService<WhatsAppOutboxRetentionService>();
        return services;
    }
}
