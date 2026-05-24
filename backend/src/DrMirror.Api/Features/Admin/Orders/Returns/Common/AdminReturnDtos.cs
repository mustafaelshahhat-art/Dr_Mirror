using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;
using FluentValidation;

namespace DrMirror.Api.Features.Admin.Orders.Returns.Common;

public sealed record AdminReturnRequestDto(
    Guid Id,
    string OrderNumber,
    string BuyerFullName,
    string? BuyerEmail,
    string? ReviewedByAdminName,
    ReturnStatus Status,
    string CustomerReason,
    string? AdminNote,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset? ReceivedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset? CancelledAt,
    int ItemCount,
    decimal TotalValue,
    IReadOnlyList<ReturnRequestItemDto> Items);

public sealed record TransitionReturnRequest(string Action, string? AdminNote);

public sealed class TransitionReturnValidator : AbstractValidator<TransitionReturnRequest>
{
    public TransitionReturnValidator()
    {
        RuleFor(x => x.Action)
            .NotEmpty()
            .Must(action => action is "Approve" or "Reject" or "MarkReceived" or "Complete");

        RuleFor(x => x.AdminNote)
            .NotEmpty()
            .When(x => x.Action == "Reject")
            .MaximumLength(1000);
    }
}
