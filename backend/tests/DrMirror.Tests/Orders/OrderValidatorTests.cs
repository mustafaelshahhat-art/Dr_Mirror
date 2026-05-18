using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Orders;

/// <summary>
/// Validate FluentValidation contracts for the orders + checkout slices.
/// Pure DTO checks — no DI / DbContext required.
/// </summary>
public class OrderValidatorTests
{
    private static ShippingAddressDto ValidAddress() => new(
        RecipientName: "محمد عبد الرحمن",
        Phone: "+201001234567",
        Governorate: "cairo",
        City: "Nasr City",
        StreetAddress: "12 Abbas El-Akkad Street",
        Floor: "3",
        Apartment: "5",
        Landmark: "Beside Carrefour",
        Notes: "Please ring twice");

    // ----- CreateOrder ---------------------------------------------------------

    [Fact]
    public void CreateOrder_accepts_minimal_valid_request()
    {
        var validator = new CreateOrderValidator();
        var request = new CreateOrderRequest(Guid.NewGuid(), ValidAddress(), BuyerAddressId: null, SaveAsNewAddress: false, Label: null, BuyerNote: null);

        var result = validator.Validate(request);

        Assert.True(result.IsValid, string.Join("; ", result.Errors.Select(e => e.ErrorMessage)));
    }

    [Fact]
    public void CreateOrder_rejects_empty_payment_method()
    {
        var validator = new CreateOrderValidator();
        var request = new CreateOrderRequest(Guid.Empty, ValidAddress(), BuyerAddressId: null, SaveAsNewAddress: false, Label: null, BuyerNote: null);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateOrderRequest.PaymentMethodId));
    }

    [Fact]
    public void CreateOrder_rejects_oversized_buyer_note()
    {
        var validator = new CreateOrderValidator();
        var request = new CreateOrderRequest(
            Guid.NewGuid(),
            ValidAddress(),
            BuyerAddressId: null,
            SaveAsNewAddress: false,
            Label: null,
            BuyerNote: new string('x', OrderLimits.MaxBuyerNote + 1));

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
    }

    // ----- SaveAsNewAddress + Label conditional rules --------------------------

    [Fact]
    public void CreateOrder_requires_label_when_saving_new_address()
    {
        var validator = new CreateOrderValidator();
        var request = new CreateOrderRequest(
            Guid.NewGuid(),
            ValidAddress(),
            BuyerAddressId: null,
            SaveAsNewAddress: true,
            Label: null,
            BuyerNote: null);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e =>
            e.PropertyName == nameof(CreateOrderRequest.Label));
    }

    [Fact]
    public void CreateOrder_requires_shipping_address_when_saving_new_address()
    {
        var validator = new CreateOrderValidator();
        // BuyerAddressId is set, ShippingAddress is null, but SaveAsNewAddress is true.
        var request = new CreateOrderRequest(
            Guid.NewGuid(),
            ShippingAddress: null,
            BuyerAddressId: Guid.NewGuid(),
            SaveAsNewAddress: true,
            Label: "Home",
            BuyerNote: null);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e =>
            e.PropertyName == nameof(CreateOrderRequest.ShippingAddress));
    }

    // ----- ShippingAddress field validation ------------------------------------

    [Fact]
    public void ShippingAddress_requires_recipient_name()
    {
        var validator = new CreateOrderValidator();
        var address = ValidAddress() with { RecipientName = "" };
        var request = new CreateOrderRequest(Guid.NewGuid(), address, BuyerAddressId: null, SaveAsNewAddress: false, Label: null, BuyerNote: null);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("12")]            // way too short
    [InlineData("not-a-number")]  // letters
    public void ShippingAddress_rejects_invalid_phone(string phone)
    {
        var validator = new CreateOrderValidator();
        var address = ValidAddress() with { Phone = phone };
        var request = new CreateOrderRequest(Guid.NewGuid(), address, BuyerAddressId: null, SaveAsNewAddress: false, Label: null, BuyerNote: null);

        var result = validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("+201001234567")]
    [InlineData("01001234567")]
    [InlineData("02 2345 6789")]
    public void ShippingAddress_accepts_egyptian_phone_formats(string phone)
    {
        var validator = new CreateOrderValidator();
        var address = ValidAddress() with { Phone = phone };
        var request = new CreateOrderRequest(Guid.NewGuid(), address, BuyerAddressId: null, SaveAsNewAddress: false, Label: null, BuyerNote: null);

        var result = validator.Validate(request);

        Assert.True(result.IsValid, $"Phone {phone} should be accepted");
    }

    // ----- CancelOrder ---------------------------------------------------------

    [Fact]
    public void CancelOrder_accepts_null_reason()
    {
        var validator = new CancelOrderValidator();
        var result = validator.Validate(new CancelOrderRequest(null));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void CancelOrder_rejects_oversized_reason()
    {
        var validator = new CancelOrderValidator();
        var result = validator.Validate(new CancelOrderRequest(
            new string('x', OrderLimits.MaxCancellationReason + 1)));

        Assert.False(result.IsValid);
    }

    // ----- ApprovePaymentProof ------------------------------------------------

    [Fact]
    public void ApprovePaymentProof_accepts_null_note()
    {
        var validator = new ApprovePaymentProofValidator();
        var result = validator.Validate(new ApprovePaymentProofRequest(null));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void ApprovePaymentProof_accepts_short_note()
    {
        var validator = new ApprovePaymentProofValidator();
        var result = validator.Validate(new ApprovePaymentProofRequest("Confirmed against bank statement"));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void ApprovePaymentProof_rejects_oversized_note()
    {
        var validator = new ApprovePaymentProofValidator();
        var result = validator.Validate(new ApprovePaymentProofRequest(
            new string('x', OrderLimits.MaxCancellationReason + 1)));

        Assert.False(result.IsValid);
    }

    // ----- RejectPaymentProof -------------------------------------------------

    [Fact]
    public void RejectPaymentProof_requires_review_note()
    {
        var validator = new RejectPaymentProofValidator();
        var result = validator.Validate(new RejectPaymentProofRequest(""));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(RejectPaymentProofRequest.ReviewNote));
    }

    [Fact]
    public void RejectPaymentProof_accepts_valid_note()
    {
        var validator = new RejectPaymentProofValidator();
        var result = validator.Validate(new RejectPaymentProofRequest("Cannot match this transfer in our records."));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void RejectPaymentProof_rejects_oversized_note()
    {
        var validator = new RejectPaymentProofValidator();
        var result = validator.Validate(new RejectPaymentProofRequest(
            new string('x', OrderLimits.MaxCancellationReason + 1)));

        Assert.False(result.IsValid);
    }
}
