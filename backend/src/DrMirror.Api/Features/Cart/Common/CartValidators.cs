using FluentValidation;

namespace DrMirror.Api.Features.Cart.Common;

public static class CartLimits
{
    /// <summary>Per-line cap. The UI also stops the stepper at this value.</summary>
    public const int MaxQuantityPerLine = 99;

    /// <summary>Cap on a single merge call so a malicious client can't flood us.</summary>
    public const int MaxMergeItems = 50;
}

public sealed class AddCartItemValidator : AbstractValidator<AddCartItemRequest>
{
    public AddCartItemValidator()
    {
        RuleFor(x => x.ProductVariantId).NotEmpty();
        RuleFor(x => x.Quantity).InclusiveBetween(1, CartLimits.MaxQuantityPerLine);
    }
}

public sealed class UpdateCartItemValidator : AbstractValidator<UpdateCartItemRequest>
{
    public UpdateCartItemValidator()
    {
        // Use DELETE (not PATCH 0) to remove a line, hence min=1 here.
        RuleFor(x => x.Quantity).InclusiveBetween(1, CartLimits.MaxQuantityPerLine);
    }
}

public sealed class MergeCartValidator : AbstractValidator<MergeCartRequest>
{
    public MergeCartValidator()
    {
        RuleFor(x => x.Items)
            .NotNull()
            .Must(items => items.Count <= CartLimits.MaxMergeItems)
            .WithMessage($"Merge payload may include at most {CartLimits.MaxMergeItems} lines.");

        RuleForEach(x => x.Items).ChildRules(line =>
        {
            line.RuleFor(l => l.ProductVariantId).NotEmpty();
            line.RuleFor(l => l.Quantity).InclusiveBetween(1, CartLimits.MaxQuantityPerLine);
        });
    }
}
