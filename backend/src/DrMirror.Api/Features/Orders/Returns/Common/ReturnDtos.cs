using DrMirror.Api.Domain.Orders;
using FluentValidation;

namespace DrMirror.Api.Features.Orders.Returns.Common;

public sealed record SubmitReturnRequest(string CustomerReason);

public sealed class SubmitReturnValidator : AbstractValidator<SubmitReturnRequest>
{
    public SubmitReturnValidator()
    {
        RuleFor(x => x.CustomerReason)
            .NotEmpty()
            .MaximumLength(1000);
    }
}

public sealed record ReturnRequestDto(
    Guid Id,
    string OrderNumber,
    ReturnStatus Status,
    string CustomerReason,
    string? AdminNote,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset? ReceivedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset? CancelledAt,
    IReadOnlyList<ReturnRequestItemDto> Items);

public sealed record ReturnRequestItemDto(
    Guid Id,
    string NameAr,
    string NameEn,
    string Sku,
    string Size,
    string ColorName,
    string ColorNameAr,
    string ColorHex,
    string? PrimaryImageUrl,
    decimal UnitPrice,
    int Quantity);
