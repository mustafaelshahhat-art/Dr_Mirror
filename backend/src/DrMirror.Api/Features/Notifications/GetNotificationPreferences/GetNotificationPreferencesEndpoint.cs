using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Notifications.GetNotificationPreferences;

public static class GetNotificationPreferencesEndpoint
{
    public static RouteGroupBuilder MapGetNotificationPreferences(this RouteGroupBuilder group)
    {
        group.MapGet("/notification-preferences", HandleAsync)
            .WithName("Notifications.GetPreferences")
            .WithSummary("Get the current buyer notification preferences.")
            .Produces<NotificationPreferenceDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(ICurrentUser current, AppDbContext db, CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var preference = await db.CustomerNotificationPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        return Results.Ok(new NotificationPreferenceDto(preference?.WhatsAppEnabled ?? true));
    }
}

public sealed record NotificationPreferenceDto(bool WhatsAppEnabled);
