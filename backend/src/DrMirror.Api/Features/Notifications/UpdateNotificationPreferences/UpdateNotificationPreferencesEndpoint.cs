using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Notifications.UpdateNotificationPreferences;

public static class UpdateNotificationPreferencesEndpoint
{
    public static RouteGroupBuilder MapUpdateNotificationPreferences(this RouteGroupBuilder group)
    {
        group.MapPut("/notification-preferences", HandleAsync)
            .WithName("Notifications.UpdatePreferences")
            .WithSummary("Update the current buyer notification preferences.")
            .WithValidation<UpdateNotificationPreferencesRequest>()
            .Produces(StatusCodes.Status204NoContent)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        UpdateNotificationPreferencesRequest request,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var now = DateTimeOffset.UtcNow;
        var preference = await db.CustomerNotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (preference is null)
        {
            db.CustomerNotificationPreferences.Add(new CustomerNotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                WhatsAppEnabled = request.WhatsAppEnabled!.Value,
                UpdatedAt = now,
            });
        }
        else
        {
            preference.WhatsAppEnabled = request.WhatsAppEnabled!.Value;
            preference.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
