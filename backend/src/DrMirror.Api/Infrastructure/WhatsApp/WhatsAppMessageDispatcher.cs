using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppMessageDispatcher
{
    private readonly AppDbContext _db;
    private readonly IWhatsAppSender _sender;
    private readonly WhatsAppOptions _options;
    private readonly ILogger<WhatsAppMessageDispatcher> _logger;

    public WhatsAppMessageDispatcher(
        AppDbContext db,
        IWhatsAppSender sender,
        IOptions<WhatsAppOptions> options,
        ILogger<WhatsAppMessageDispatcher> logger)
    {
        _db = db;
        _sender = sender;
        _options = options.Value;
        _logger = logger;
    }

    public async Task DispatchAsync(WhatsAppOutboxMessage message, CancellationToken ct)
    {
        // Unknown event type: skip immediately — retrying will never fix a bad type.
        if (!IsKnownEventType(message.EventType))
        {
            _logger.LogWarning("WhatsAppOutbox: unknown event type {EventType} (id={Id}), skipping", message.EventType, message.Id);
            MarkSkipped(message, "unknown_event_type");
            return;
        }

        var resolved = await ResolveAsync(message, ct);
        if (resolved is null)
        {
            MarkSkipped(message, "entity_not_found");
            return;
        }

        if (string.IsNullOrWhiteSpace(resolved.Phone))
        {
            MarkSkipped(message, "no_phone");
            return;
        }

        var preference = await _db.CustomerNotificationPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == resolved.BuyerUserId, ct);
        if (preference is { WhatsAppEnabled: false })
        {
            MarkSkipped(message, "opted_out");
            return;
        }

        var today = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        var sentToday = await _db.WhatsAppOutboxMessages.CountAsync(m =>
            m.RecipientPhoneMasked == message.RecipientPhoneMasked &&
            m.Status == WhatsAppOutboxStatus.Sent &&
            m.CreatedAt >= today,
            ct);
        if (sentToday >= _options.DailyLimitPerPhone)
        {
            MarkSkipped(message, "daily_limit_exceeded");
            return;
        }

        // Per-message send timeout — prevents Processing/Retrying records from getting stuck
        // when the sidecar is slow or Baileys hangs on sendMessage().
        using var sendCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        sendCts.CancelAfter(TimeSpan.FromSeconds(_options.SendTimeoutSeconds));
        try
        {
            await _sender.SendAsync(resolved.Phone, resolved.Body, sendCts.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            // App is still running — this is a per-message timeout, not shutdown.
            throw new WhatsAppTransientFailureException("sidecar_timeout");
        }

        message.Status = WhatsAppOutboxStatus.Sent;
        message.DeliveredAt = DateTimeOffset.UtcNow;
        message.LockedAt = null;
        message.LockedBy = null;
        message.FailureReason = null;
        _logger.LogInformation(
            "WhatsAppOutbox: sent {EventType} (id={Id}, phone={MaskedPhone})",
            message.EventType,
            message.Id,
            message.RecipientPhoneMasked);
    }

    private async Task<ResolvedMessage?> ResolveAsync(WhatsAppOutboxMessage message, CancellationToken ct)
    {
        var snapshot = TryReadSnapshot(message.Payload);
        if (snapshot?.MessageBody is { Length: > 0 })
        {
            return new ResolvedMessage(snapshot.BuyerUserId, snapshot.RecipientPhone, snapshot.MessageBody);
        }

        return message.EventType switch
        {
            "OrderConfirmation" => await ResolveOrderConfirmationAsync(message.Payload, ct),
            "OrderStatusChanged" => await ResolveOrderStatusChangedAsync(message.Payload, ct),
            "ReturnCreated" => await ResolveReturnCreatedAsync(message.Payload, ct),
            "ReturnStatusChanged" => await ResolveReturnStatusChangedAsync(message.Payload, ct),
            _ => null,
        };
    }

    private async Task<ResolvedMessage?> ResolveOrderConfirmationAsync(string payload, CancellationToken ct)
    {
        var p = JsonSerializer.Deserialize<WhatsAppOutboxHelper.OrderPayload>(payload)!;
        var order = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == p.OrderId, ct);
        return order is null
            ? null
            : new ResolvedMessage(order.BuyerUserId, order.ShippingAddress.Phone, WhatsAppMessageTemplates.OrderConfirmation(order.OrderNumber));
    }

    private async Task<ResolvedMessage?> ResolveOrderStatusChangedAsync(string payload, CancellationToken ct)
    {
        var p = JsonSerializer.Deserialize<WhatsAppOutboxHelper.OrderPayload>(payload)!;
        var order = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == p.OrderId, ct);
        if (order is null) return null;

        var status = Enum.TryParse<OrderStatus>(p.Status, ignoreCase: true, out var parsed)
            ? parsed
            : order.Status;
        return new ResolvedMessage(
            order.BuyerUserId,
            order.ShippingAddress.Phone,
            WhatsAppMessageTemplates.OrderStatusChanged(order.OrderNumber, status));
    }

    private async Task<ResolvedMessage?> ResolveReturnCreatedAsync(string payload, CancellationToken ct)
    {
        var p = JsonSerializer.Deserialize<WhatsAppOutboxHelper.ReturnPayload>(payload)!;
        var returnRequest = await _db.ReturnRequests
            .AsNoTracking()
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.Id == p.ReturnRequestId, ct);
        if (returnRequest?.Order is null) return null;

        return new ResolvedMessage(
            returnRequest.BuyerUserId,
            returnRequest.Order.ShippingAddress.Phone,
            WhatsAppMessageTemplates.ReturnCreated(ReturnRef(returnRequest.Id)));
    }

    private async Task<ResolvedMessage?> ResolveReturnStatusChangedAsync(string payload, CancellationToken ct)
    {
        var p = JsonSerializer.Deserialize<WhatsAppOutboxHelper.ReturnPayload>(payload)!;
        var returnRequest = await _db.ReturnRequests
            .AsNoTracking()
            .Include(r => r.Order)
            .FirstOrDefaultAsync(r => r.Id == p.ReturnRequestId, ct);
        if (returnRequest?.Order is null) return null;

        var status = Enum.TryParse<ReturnStatus>(p.Status, ignoreCase: true, out var parsed)
            ? parsed
            : returnRequest.Status;
        return new ResolvedMessage(
            returnRequest.BuyerUserId,
            returnRequest.Order.ShippingAddress.Phone,
            WhatsAppMessageTemplates.ReturnStatusChanged(ReturnRef(returnRequest.Id), status));
    }

    private static void MarkSkipped(WhatsAppOutboxMessage message, string reason)
    {
        message.Status = WhatsAppOutboxStatus.Skipped;
        message.FailureReason = reason;
        message.LockedAt = null;
        message.LockedBy = null;
    }

    private static string ReturnRef(Guid id) => id.ToString("N")[..8].ToUpperInvariant();

    private static bool IsKnownEventType(string eventType) => eventType is
        "OrderConfirmation" or "OrderStatusChanged" or "ReturnCreated" or "ReturnStatusChanged";

    private static WhatsAppOutboxHelper.MessagePayload? TryReadSnapshot(string payload)
    {
        try
        {
            return JsonSerializer.Deserialize<WhatsAppOutboxHelper.MessagePayload>(
                payload,
                new JsonSerializerOptions(JsonSerializerDefaults.Web));
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record ResolvedMessage(Guid BuyerUserId, string? Phone, string Body);
}
