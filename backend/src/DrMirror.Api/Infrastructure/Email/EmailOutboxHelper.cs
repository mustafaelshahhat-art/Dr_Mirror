using System.Text.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Infrastructure.Email;

public static class EmailOutboxHelper
{
    public static EmailOutboxMessage ForOrderConfirmation(Guid orderId) => new()
    {
        Id = Guid.NewGuid(),
        EventType = "OrderConfirmation",
        Payload = orderId.ToString(),
        IdempotencyKey = $"OrderConfirmation:{orderId}",
        NextRetryAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    public static EmailOutboxMessage ForPaymentReviewNeeded(Guid orderId) => new()
    {
        Id = Guid.NewGuid(),
        EventType = "PaymentReviewNeeded",
        Payload = orderId.ToString(),
        // Not idempotent on orderId alone — buyer may upload multiple proofs.
        IdempotencyKey = $"PaymentReviewNeeded:{orderId}:{DateTimeOffset.UtcNow.Ticks}",
        NextRetryAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    public static EmailOutboxMessage ForStatusChanged(Guid orderId, OrderStatus status) => new()
    {
        Id = Guid.NewGuid(),
        EventType = "StatusChanged",
        Payload = JsonSerializer.Serialize(new StatusChangedPayload(orderId, status)),
        // Unique per (order, target-status) — re-transitions are expected.
        IdempotencyKey = $"StatusChanged:{orderId}:{(int)status}:{DateTimeOffset.UtcNow.Ticks}",
        NextRetryAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    public static EmailOutboxMessage ForInquiryReceived(Guid inquiryId) => new()
    {
        Id = Guid.NewGuid(),
        EventType = "InquiryReceived",
        Payload = inquiryId.ToString(),
        IdempotencyKey = $"InquiryReceived:{inquiryId}",
        NextRetryAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    public static EmailOutboxMessage ForReturnStatusChanged(Guid returnRequestId, ReturnStatus status) => new()
    {
        Id = Guid.NewGuid(),
        EventType = "ReturnStatusChanged",
        Payload = JsonSerializer.Serialize(new ReturnStatusChangedPayload(returnRequestId, status)),
        IdempotencyKey = $"ReturnStatusChanged:{returnRequestId}:{(int)status}:{DateTimeOffset.UtcNow.Ticks}",
        NextRetryAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    public static EmailOutboxMessage ForReturnCreated(Guid returnRequestId) => new()
    {
        Id = Guid.NewGuid(),
        EventType = "ReturnCreated",
        Payload = returnRequestId.ToString(),
        IdempotencyKey = $"ReturnCreated:{returnRequestId}",
        NextRetryAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    public sealed record StatusChangedPayload(Guid OrderId, OrderStatus Status);
    public sealed record ReturnStatusChangedPayload(Guid ReturnRequestId, ReturnStatus Status);
}
