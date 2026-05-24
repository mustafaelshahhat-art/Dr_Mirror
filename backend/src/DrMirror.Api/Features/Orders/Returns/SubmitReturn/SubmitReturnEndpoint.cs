using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
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
                statusCode: StatusCodes.Status409Conflict);
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

        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(ct)
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

        try
        {
            await db.SaveChangesAsync(ct);
            if (transaction is not null)
            {
                await transaction.CommitAsync(ct);
            }
        }
        catch (DbUpdateException)
        {
            return Results.Problem(
                title: "Active return already exists",
                detail: "This order already has an active return request.",
                statusCode: StatusCodes.Status409Conflict);
        }

        returnRequest.Order = order;
        return Results.Created($"/api/orders/{orderNumber}/returns/{returnRequest.Id}", returnRequest.ToDto());
    }
}
