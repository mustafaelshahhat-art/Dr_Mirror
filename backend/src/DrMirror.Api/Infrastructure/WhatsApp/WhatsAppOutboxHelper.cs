using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public static class WhatsAppOutboxHelper
{
    private static readonly JsonSerializerOptions PayloadJsonOptions = new(JsonSerializerDefaults.Web);

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

    public static WhatsAppOutboxMessage CreateForOrder(Order order, string eventType, string status)
    {
        var normalizedStatus = status.Trim();
        var now = DateTimeOffset.UtcNow;
        var messageBody = eventType == "OrderConfirmation"
            ? WhatsAppMessageTemplates.OrderConfirmation(order.OrderNumber)
            : WhatsAppMessageTemplates.OrderStatusChanged(order.OrderNumber, ParseOrderStatus(normalizedStatus, order.Status));

        return new WhatsAppOutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = eventType,
            Payload = JsonSerializer.Serialize(new MessagePayload(
                eventType,
                order.Id,
                order.BuyerUserId,
                order.OrderNumber,
                normalizedStatus,
                order.Total,
                null,
                order.ShippingAddress.RecipientName,
                order.ShippingAddress.Phone,
                messageBody), PayloadJsonOptions),
            RecipientPhoneMasked = MaskPhone(order.ShippingAddress.Phone),
            IdempotencyKey = $"order:{order.Id}:{normalizedStatus.ToLowerInvariant()}",
            EntityType = "Order",
            EntityId = order.Id,
            CreatedAt = now,
            NextRetryAt = now,
        };
    }

    public static WhatsAppOutboxMessage CreateForReturn(ReturnRequest returnRequest, string eventType, string status)
    {
        var normalizedStatus = status.Trim();
        var now = DateTimeOffset.UtcNow;
        var returnRef = ReturnRef(returnRequest.Id);
        var parsedStatus = ParseReturnStatus(normalizedStatus, returnRequest.Status);
        var phone = returnRequest.Order?.ShippingAddress.Phone;
        var messageBody = eventType == "ReturnCreated"
            ? WhatsAppMessageTemplates.ReturnCreated(returnRef)
            : WhatsAppMessageTemplates.ReturnStatusChanged(returnRef, parsedStatus);

        return new WhatsAppOutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = eventType,
            Payload = JsonSerializer.Serialize(new MessagePayload(
                eventType,
                returnRequest.Id,
                returnRequest.BuyerUserId,
                returnRef,
                normalizedStatus,
                null,
                returnRequest.CustomerReason,
                returnRequest.Order?.ShippingAddress.RecipientName,
                phone,
                messageBody), PayloadJsonOptions),
            RecipientPhoneMasked = MaskPhone(phone),
            IdempotencyKey = $"return:{returnRequest.Id}:{normalizedStatus.ToLowerInvariant()}",
            EntityType = "Return",
            EntityId = returnRequest.Id,
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
    public sealed record MessagePayload(
        string EventType,
        Guid EntityId,
        Guid BuyerUserId,
        string EntityReference,
        string Status,
        decimal? TotalAmount,
        string? ReturnReason,
        string? RecipientName,
        string? RecipientPhone,
        string MessageBody,
        int? PayloadVersion = 1);

    private static OrderStatus ParseOrderStatus(string status, OrderStatus fallback) =>
        Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsed) ? parsed : fallback;

    private static ReturnStatus ParseReturnStatus(string status, ReturnStatus fallback) =>
        Enum.TryParse<ReturnStatus>(status, ignoreCase: true, out var parsed) ? parsed : fallback;

    private static string ReturnRef(Guid id) => id.ToString("N")[..8].ToUpperInvariant();

    private static bool IsDuplicateOutboxKey(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("UX_WhatsAppOutboxMessages_IdempotencyKey", StringComparison.OrdinalIgnoreCase);
    }
}
