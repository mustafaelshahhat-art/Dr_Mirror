using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DrMirror.Api.Features.Admin.WhatsApp.GetWhatsAppAttempts;

public static class GetWhatsAppAttemptsEndpoint
{
    public static RouteGroupBuilder MapGetWhatsAppAttempts(this RouteGroupBuilder group)
    {
        group.MapGet("/attempts", HandleAsync)
            .WithName("Admin.WhatsApp.Attempts")
            .WithSummary("List paginated WhatsApp notification attempts.")
            .Produces<PagedResult<WhatsAppAttemptDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        int? page,
        int? limit,
        AppDbContext db,
        CancellationToken ct)
    {
        var pageNumber = Math.Max(1, page ?? 1);
        var pageSize = Math.Clamp(limit ?? 20, 1, 100);
        var total = await db.WhatsAppOutboxMessages.CountAsync(ct);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));

        var messages = await db.WhatsAppOutboxMessages
            .AsNoTracking()
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = messages.Select(m => new WhatsAppAttemptDto(
            m.Id,
            m.EventType,
            m.RecipientPhoneMasked,
            m.Status.ToString().ToLowerInvariant(),
            m.Attempts,
            m.FailureReason,
            m.IdempotencyKey,
            m.CreatedAt,
            m.DeliveredAt,
            m.LastAttemptAt,
            m.EntityType,
            m.EntityId,
            ReadEntityReference(m.Payload),
            m.ParentMessageId)).ToList();

        return Results.Ok(new PagedResult<WhatsAppAttemptDto>(items, pageNumber, pageSize, total, totalPages));
    }

    private static string? ReadEntityReference(string payload)
    {
        try
        {
            return JsonSerializer.Deserialize<WhatsAppOutboxHelper.MessagePayload>(
                payload,
                new JsonSerializerOptions(JsonSerializerDefaults.Web))?.EntityReference;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

public sealed record WhatsAppAttemptDto(
    Guid Id,
    string EventType,
    string RecipientPhoneMasked,
    string Status,
    int Attempts,
    string? FailureReason,
    string IdempotencyKey,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DeliveredAt,
    DateTimeOffset? LastAttemptAt,
    string? EntityType,
    Guid? EntityId,
    string? EntityReference,
    Guid? ParentMessageId);
