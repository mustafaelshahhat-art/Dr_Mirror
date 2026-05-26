using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Admin.WhatsApp.RetryWhatsAppAttempt;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared.Auditing;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.WhatsApp.RetryAllFailedWhatsApp;

public static class RetryAllFailedWhatsAppEndpoint
{
    public static RouteGroupBuilder MapRetryAllFailedWhatsApp(this RouteGroupBuilder group)
    {
        group.MapPost("/attempts/retry-all-failed", HandleAsync)
            .WithName("Admin.WhatsApp.RetryAllFailed")
            .WithSummary("Queue retries for all failed WhatsApp attempts.")
            .Produces<RetryAllFailedWhatsAppResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext db,
        IAdminAuditWriter audit,
        HttpContext http,
        CancellationToken ct)
    {
        var queued = 0;

        while (true)
        {
            var failed = await db.WhatsAppOutboxMessages
                .Where(m => m.Status == WhatsAppOutboxStatus.Failed)
                .OrderBy(m => m.CreatedAt)
                .Take(100)
                .ToListAsync(ct);

            if (failed.Count == 0)
            {
                break;
            }

            var now = DateTimeOffset.UtcNow;
            foreach (var original in failed)
            {
                original.Status = WhatsAppOutboxStatus.Retrying;
                db.WhatsAppOutboxMessages.Add(RetryWhatsAppAttemptEndpoint.CreateChild(original, now));
            }

            queued += failed.Count;
            await WhatsAppOutboxHelper.SaveChangesIgnoringDuplicateAsync(db, ct);
        }

        await audit.WriteAsync("WhatsApp.RetryAll", "WhatsAppMessage", string.Empty, null, null, ct, $"Queued {queued} messages");
        await db.SaveChangesAsync(ct);
        http.Response.Headers.CacheControl = "no-store";
        return Results.Ok(new RetryAllFailedWhatsAppResponse(queued));
    }
}

public sealed record RetryAllFailedWhatsAppResponse(int Queued);
