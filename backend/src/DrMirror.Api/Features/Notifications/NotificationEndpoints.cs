using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Features.Notifications.GetNotificationPreferences;
using DrMirror.Api.Features.Notifications.UpdateNotificationPreferences;
using Microsoft.AspNetCore.Authorization;

namespace DrMirror.Api.Features.Notifications;

public static class NotificationEndpoints
{
    public static IEndpointRouteBuilder MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/me")
            .WithTags("Notifications")
            .RequireAuthorization(new AuthorizeAttribute { Roles = UserRoles.Buyer });

        group.MapGetNotificationPreferences();
        group.MapUpdateNotificationPreferences();
        return app;
    }
}
