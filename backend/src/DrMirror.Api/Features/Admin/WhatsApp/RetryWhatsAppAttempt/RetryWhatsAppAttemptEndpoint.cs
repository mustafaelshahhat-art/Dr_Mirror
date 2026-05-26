using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Auditing;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.WhatsApp.RetryWhatsAppAttempt;

public static class RetryWhatsAppAttemptEndpoint
{
    public static RouteGroupBuilder MapRetryWhatsAppAttempt(this RouteGroupBuilder group)
    {
        group.MapPost("/attempts/{id:guid}/retry", HandleAsync)
            .WithName("Admin.WhatsApp.RetryAttempt")
            .WithSummary("Queue a retry for a failed WhatsApp attempt.")
            .Produces<RetryWhatsAppAttemptResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        AppDbContext db,
        IAdminAuditWriter audit,
        HttpContext http,
        CancellationToken ct)
    {
        var original = await db.WhatsAppOutboxMessages.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (original is null)
        {
            return Results.NotFound();
        }

        if (original.Status != WhatsAppOutboxStatus.Failed)
        {
            return Results.BadRequest(new { code = "NotRetryable", detail = "Message status must be Failed to retry." });
        }

        var now = DateTimeOffset.UtcNow;
        original.Status = WhatsAppOutboxStatus.Retrying;
        var child = CreateChild(original, now);
        db.WhatsAppOutboxMessages.Add(child);

        await audit.WriteAsync("WhatsApp.Retry", "WhatsAppMessage", id.ToString(), WhatsAppOutboxStatus.Failed.ToString(), WhatsAppOutboxStatus.Retrying.ToString(), ct);
        await db.SaveChangesAsync(ct);
        http.Response.Headers.CacheControl = "no-store";
        return Results.Ok(new RetryWhatsAppAttemptResponse(id, child.Id));
    }

    internal static WhatsAppOutboxMessage CreateChild(WhatsAppOutboxMessage original, DateTimeOffset now)
    {
        var childId = Guid.NewGuid();
        // Always root the key at the original business key so retry chains don't nest (SC-008, FR-016)
        var retryIdx = original.IdempotencyKey.IndexOf(":retry:", StringComparison.Ordinal);
        var rootKey = retryIdx >= 0 ? original.IdempotencyKey[..retryIdx] : original.IdempotencyKey;
        return new WhatsAppOutboxMessage
        {
            Id = childId,
            ParentMessageId = original.Id,
            Status = WhatsAppOutboxStatus.Pending,
            IdempotencyKey = $"{rootKey}:retry:{childId:N}",
            EventType = original.EventType,
            Payload = original.Payload,
            RecipientPhoneMasked = original.RecipientPhoneMasked,
            Attempts = 0,
            NextRetryAt = now,
            CreatedAt = now,
            EntityType = original.EntityType,
            EntityId = original.EntityId,
        };
    }
}

public sealed record RetryWhatsAppAttemptResponse(Guid OriginalId, Guid RetryId);
