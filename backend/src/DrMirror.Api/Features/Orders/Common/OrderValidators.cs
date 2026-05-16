using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Orders;
using FluentValidation;

namespace DrMirror.Api.Features.Orders.Common;

public static class OrderLimits
{
    public const int MaxBuyerNote = 1000;
    public const int MaxCancellationReason = 500;
}

internal sealed class ShippingAddressValidator : AbstractValidator<ShippingAddressDto>
{
    /// <summary>
    /// Egyptian phone: optional <c>+20</c>, then 10–11 digits. Permissive in V1
    /// so we don't reject legitimate land-line numbers.
    /// </summary>
    private static readonly System.Text.RegularExpressions.Regex PhoneRegex =
        new(@"^\+?\d[\d\s\-]{8,18}\d$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public ShippingAddressValidator()
    {
        RuleFor(a => a.RecipientName).NotEmpty().MaximumLength(100);
        RuleFor(a => a.Phone)
            .NotEmpty()
            .Must(p => PhoneRegex.IsMatch(p))
            .WithMessage("Phone number is not valid.");
        RuleFor(a => a.Governorate)
            .NotEmpty()
            .MaximumLength(100)
            .Must(Governorates.IsValid)
            .WithMessage("Governorate must be one of the 27 Egyptian governorates.");
        RuleFor(a => a.City).NotEmpty().MaximumLength(100);
        RuleFor(a => a.StreetAddress).NotEmpty().MaximumLength(200);
        RuleFor(a => a.Floor).MaximumLength(50);
        RuleFor(a => a.Apartment).MaximumLength(50);
        RuleFor(a => a.Landmark).MaximumLength(200);
        RuleFor(a => a.Notes).MaximumLength(500);
    }
}

public sealed class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator()
    {
        RuleFor(r => r.PaymentMethodId).NotEmpty();
        // Exactly one of BuyerAddressId or ShippingAddress must be provided.
        RuleFor(r => r)
            .Must(r => r.BuyerAddressId.HasValue ^ r.ShippingAddress is not null)
            .WithMessage("Provide either a saved buyerAddressId OR an inline shippingAddress, not both.");
        // When inline, validate the embedded address.
        When(r => r.ShippingAddress is not null, () =>
        {
            RuleFor(r => r.ShippingAddress!).SetValidator(new ShippingAddressValidator());
        });
        // Label is only used when persisting a new inline address.
        When(r => r.SaveAsNewAddress, () =>
        {
            RuleFor(r => r.Label).NotEmpty().MaximumLength(64)
                .WithMessage("Label is required when saving the address to the address book.");
            RuleFor(r => r.ShippingAddress)
                .NotNull()
                .WithMessage("Cannot save a new address when checking out with a saved address id.");
        });
        RuleFor(r => r.BuyerNote).MaximumLength(OrderLimits.MaxBuyerNote);
    }
}

public sealed class CancelOrderValidator : AbstractValidator<CancelOrderRequest>
{
    public CancelOrderValidator()
    {
        RuleFor(r => r.Reason).MaximumLength(OrderLimits.MaxCancellationReason);
    }
}

public sealed class TransitionOrderValidator : AbstractValidator<TransitionOrderRequest>
{
    public TransitionOrderValidator()
    {
        RuleFor(r => r.ToStatus).IsInEnum();
        RuleFor(r => r.Reason).MaximumLength(OrderLimits.MaxCancellationReason);
    }
}

public sealed class ApprovePaymentProofValidator : AbstractValidator<ApprovePaymentProofRequest>
{
    public ApprovePaymentProofValidator()
    {
        RuleFor(r => r.ReviewNote).MaximumLength(OrderLimits.MaxCancellationReason);
    }
}

public sealed class RejectPaymentProofValidator : AbstractValidator<RejectPaymentProofRequest>
{
    public RejectPaymentProofValidator()
    {
        // Rejection must always include a reason — that's what the buyer sees.
        RuleFor(r => r.ReviewNote)
            .NotEmpty()
            .MaximumLength(OrderLimits.MaxCancellationReason);
    }
}
