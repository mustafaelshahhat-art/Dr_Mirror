using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public static class WhatsAppOutboxHelper
{
    public static async Task SaveChangesIgnoringDuplicateAsync(AppDbContext db, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsDuplicateOutboxKey(ex))
        {
            foreach (var entry in db.ChangeTracker.Entries<WhatsAppOutboxMessage>()
                         .Where(e => e.State == EntityState.Added))
            {
                entry.State = EntityState.Detached;
            }

            await db.SaveChangesAsync(ct);
        }
    }

    public static WhatsAppOutboxMessage CreateForOrder(Guid orderId, Guid buyerUserId, string eventType, string status, string? phone)
    {
        var normalizedStatus = status.Trim();
        var now = DateTimeOffset.UtcNow;
        return new WhatsAppOutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = eventType,
            Payload = JsonSerializer.Serialize(new OrderPayload(orderId, normalizedStatus)),
            BuyerUserId = buyerUserId,
            RecipientPhoneMasked = MaskPhone(phone),
            Priority = WhatsAppMessagePriority.Normal,
            IdempotencyKey = $"order:{orderId}:{normalizedStatus.ToLowerInvariant()}",
            CreatedAt = now,
            NextRetryAt = now,
        };
    }

    public static WhatsAppOutboxMessage CreateForReturn(Guid returnRequestId, Guid buyerUserId, string eventType, string status, string? phone)
    {
        var normalizedStatus = status.Trim();
        var now = DateTimeOffset.UtcNow;
        return new WhatsAppOutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = eventType,
            Payload = JsonSerializer.Serialize(new ReturnPayload(returnRequestId, normalizedStatus)),
            BuyerUserId = buyerUserId,
            RecipientPhoneMasked = MaskPhone(phone),
            Priority = WhatsAppMessagePriority.Normal,
            IdempotencyKey = $"return:{returnRequestId}:{normalizedStatus.ToLowerInvariant()}",
            CreatedAt = now,
            NextRetryAt = now,
        };
    }

    public static string MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "unknown";

        var value = phone.Trim();
        var digitPositions = value
            .Select((ch, index) => (ch, index))
            .Where(x => char.IsDigit(x.ch))
            .Select(x => x.index)
            .ToArray();

        if (digitPositions.Length <= 4) return new string('*', value.Length);

        var chars = value.ToCharArray();
        foreach (var index in digitPositions.Take(digitPositions.Length - 4).Skip(2))
        {
            chars[index] = '*';
        }

        return new string(chars);
    }

    public sealed record OrderPayload(Guid OrderId, string Status);
    public sealed record ReturnPayload(Guid ReturnRequestId, string Status);

    private static bool IsDuplicateOutboxKey(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("UX_WhatsAppOutboxMessages_IdempotencyKey", StringComparison.OrdinalIgnoreCase);
    }
}
