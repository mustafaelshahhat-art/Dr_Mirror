using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.Returns.SubmitReturn;

public static class SubmitReturnEndpoint
{
    public static RouteGroupBuilder MapSubmitReturn(this RouteGroupBuilder group)
    {
        group.MapPost("/{orderNumber}/returns", HandleAsync)
            .WithName("Orders.Returns.Submit")
            .WithSummary("Submit a full-order return request for a delivered order.")
            .RequireAuthorization()
            .WithValidation<SubmitReturnRequest>()
            .Produces<ReturnRequestDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        SubmitReturnRequest request,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var order = await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber && o.BuyerUserId == userId, ct);

        if (order is null)
        {
            return Results.Problem(title: "Order not found", statusCode: StatusCodes.Status404NotFound);
        }

        if (order.Status != OrderStatus.Delivered)
        {
            return Results.Problem(
                title: "Order is not eligible for return",
                detail: "Only delivered orders can be returned.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        // FR-003: delivery timestamp must exist
        if (order.DeliveredAt is null)
        {
            return Results.Problem(
                title: "Delivery date unavailable",
                detail: "Cannot calculate the return window because no delivery date is recorded.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        // FR-004: 14-day exclusive window (days 1–13 valid; day 14+ rejected)
        var daysSinceDelivery = (DateTimeOffset.UtcNow - order.DeliveredAt.Value).TotalDays;
        if (daysSinceDelivery >= 14.0)
        {
            return Results.Problem(
                title: "Return window expired",
                detail: "The 14-day return window has closed for this order.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var hasActiveReturn = await db.ReturnRequests.AnyAsync(r =>
            r.OrderId == order.Id &&
            (r.Status == ReturnStatus.Requested || r.Status == ReturnStatus.Approved || r.Status == ReturnStatus.Received),
            ct);

        if (hasActiveReturn)
        {
            return Results.Problem(
                title: "Active return already exists",
                detail: "This order already has an active return request.",
                statusCode: StatusCodes.Status409Conflict);
        }

        IResult? result = null;
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async ctInner =>
        {
            await using var transaction = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync(ctInner)
                : null;

            var now = DateTimeOffset.UtcNow;
            var returnRequest = new ReturnRequest
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                BuyerUserId = userId,
                Status = ReturnStatus.Requested,
                CustomerReason = request.CustomerReason.Trim(),
                CreatedAt = now,
                UpdatedAt = now,
                Items = order.Items.Select(item => new ReturnRequestItem
                {
                    Id = Guid.NewGuid(),
                    OrderItemId = item.Id,
                    ProductVariantId = item.ProductVariantId,
                    NameAr = item.NameAr,
                    NameEn = item.NameEn,
                    Sku = item.Sku,
                    Size = item.Size,
                    ColorName = item.ColorName,
                    ColorNameAr = item.ColorNameAr,
                    ColorHex = item.ColorHex,
                    PrimaryImageUrl = item.PrimaryImageUrl,
                    UnitPrice = item.UnitPrice,
                    Quantity = item.Quantity,
                }).ToList(),
            };

            db.ReturnRequests.Add(returnRequest);
            db.EmailOutboxMessages.Add(EmailOutboxHelper.ForReturnCreated(returnRequest.Id));
            db.WhatsAppOutboxMessages.Add(WhatsAppOutboxHelper.CreateForReturn(
                returnRequest.Id,
                "ReturnCreated",
                ReturnStatus.Requested.ToString(),
                order.ShippingAddress.Phone));

            try
            {
                await WhatsAppOutboxHelper.SaveChangesIgnoringDuplicateAsync(db, ctInner);
                if (transaction is not null)
                {
                    await transaction.CommitAsync(ctInner);
                }
            }
            catch (DbUpdateException ex) when (IsReturnDuplicate(ex))
            {
                result = Results.Problem(
                    title: "Active return already exists",
                    detail: "This order already has an active return request.",
                    statusCode: StatusCodes.Status409Conflict);
                return;
            }

            returnRequest.Order = order;
            result = Results.Created($"/api/orders/{orderNumber}/returns/{returnRequest.Id}", returnRequest.ToDto());
        }, ct);

        return result ?? Results.Problem(title: "Return request creation failed", statusCode: StatusCodes.Status500InternalServerError);
    }

    private static bool IsReturnDuplicate(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        // SQL Server unique constraint on the ReturnRequests table (one active return per order).
        return message.Contains("ReturnRequests", StringComparison.OrdinalIgnoreCase)
            && (message.Contains("UQ_") || message.Contains("UNIQUE") || message.Contains("duplicate key"));
    }
}
