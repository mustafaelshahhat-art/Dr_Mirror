using DrMirror.Api.Features.Cart.Common;

namespace DrMirror.Tests.Cart;

/// <summary>
/// Validate the FluentValidation contracts for the cart slice. These run
/// purely against the request DTOs — no DI / DbContext required.
/// </summary>
public class CartValidatorTests
{
    // -------------------------------------------------------------------------
    // AddCartItem
    // -------------------------------------------------------------------------

    [Fact]
    public void AddCartItem_accepts_valid_request()
    {
        var validator = new AddCartItemValidator();
        var request = new AddCartItemRequest(Guid.NewGuid(), Quantity: 3);

        var result = validator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(100)]
    public void AddCartItem_rejects_out_of_range_quantity(int quantity)
    {
        var validator = new AddCartItemValidator();
        var request = new AddCartItemRequest(Guid.NewGuid(), quantity);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AddCartItemRequest.Quantity));
    }

    [Fact]
    public void AddCartItem_rejects_empty_variant_id()
    {
        var validator = new AddCartItemValidator();
        var request = new AddCartItemRequest(Guid.Empty, 1);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AddCartItemRequest.ProductVariantId));
    }

    // -------------------------------------------------------------------------
    // UpdateCartItem
    // -------------------------------------------------------------------------

    [Theory]
    [InlineData(1, true)]
    [InlineData(99, true)]
    [InlineData(0, false)]    // 0 means "remove" — caller must use DELETE, not PATCH
    [InlineData(100, false)]  // exceeds the per-line cap
    public void UpdateCartItem_quantity_bounds(int quantity, bool expected)
    {
        var validator = new UpdateCartItemValidator();
        var request = new UpdateCartItemRequest(quantity);

        var result = validator.Validate(request);

        Assert.Equal(expected, result.IsValid);
    }

    // -------------------------------------------------------------------------
    // MergeCart
    // -------------------------------------------------------------------------

    [Fact]
    public void MergeCart_accepts_empty_list()
    {
        var validator = new MergeCartValidator();
        var request = new MergeCartRequest(Array.Empty<MergeCartLine>());

        var result = validator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void MergeCart_accepts_max_size_payload()
    {
        var validator = new MergeCartValidator();
        var lines = Enumerable.Range(0, CartLimits.MaxMergeItems)
            .Select(_ => new MergeCartLine(Guid.NewGuid(), 1))
            .ToList();
        var request = new MergeCartRequest(lines);

        var result = validator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void MergeCart_rejects_oversized_payload()
    {
        var validator = new MergeCartValidator();
        var lines = Enumerable.Range(0, CartLimits.MaxMergeItems + 1)
            .Select(_ => new MergeCartLine(Guid.NewGuid(), 1))
            .ToList();
        var request = new MergeCartRequest(lines);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void MergeCart_rejects_line_with_invalid_quantity()
    {
        var validator = new MergeCartValidator();
        var request = new MergeCartRequest(new[]
        {
            new MergeCartLine(Guid.NewGuid(), 1),
            new MergeCartLine(Guid.NewGuid(), 0), // bad
        });

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
    }
}
