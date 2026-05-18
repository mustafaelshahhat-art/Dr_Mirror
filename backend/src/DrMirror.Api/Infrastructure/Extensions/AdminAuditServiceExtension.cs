using DrMirror.Api.Shared.Auditing;

namespace DrMirror.Api.Infrastructure.Extensions;

internal static class AdminAuditServiceExtension
{
    internal static IServiceCollection AddAdminAuditServices(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IAdminAuditWriter, AdminAuditWriter>();
        return services;
    }
}
