using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Features.Addresses;

namespace DrMirror.Tests.Addresses;

public class GovernoratesRegistryTests
{
    [Fact]
    public void Registry_contains_exactly_27_governorates()
    {
        Assert.Equal(27, Governorates.All.Count);
    }

    [Theory]
    [InlineData("cairo")]
    [InlineData("alexandria")]
    [InlineData("kafr-el-sheikh")]
    [InlineData("CAIRO")]    // case-insensitive
    [InlineData("Alexandria")]
    public void IsValid_accepts_canonical_slugs_case_insensitively(string slug)
    {
        Assert.True(Governorates.IsValid(slug));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("nasr city")]   // free-form city, not a governorate
    [InlineData("القاهرة")]      // Arabic display — slug must be the ASCII canonical
    [InlineData("Cairo Governorate")]
    public void IsValid_rejects_non_canonical(string? value)
    {
        Assert.False(Governorates.IsValid(value));
    }

    [Theory]
    [InlineData("CAIRO", "cairo")]
    [InlineData("Cairo", "cairo")]
    [InlineData("kafr-el-sheikh", "kafr-el-sheikh")]
    public void Normalize_returns_canonical_slug_when_recognised(string input, string expected)
    {
        Assert.Equal(expected, Governorates.Normalize(input));
    }

    [Fact]
    public void Normalize_returns_input_unchanged_when_unrecognised()
    {
        Assert.Equal("custom-place", Governorates.Normalize("custom-place"));
    }
}

public class BuyerAddressValidatorTests
{
    private static BuyerAddressUpsertRequest ValidRequest() => new(
        Label: "Home",
        RecipientName: "Mostafa",
        Phone: "+201001234567",
        Governorate: "cairo",
        City: "Nasr City",
        StreetAddress: "12 Abbas El-Akkad",
        Floor: "3",
        Apartment: "5",
        Landmark: null,
        Notes: null,
        SetDefault: false);

    [Fact]
    public void Accepts_minimal_valid_request()
    {
        var v = new BuyerAddressUpsertValidator();
        Assert.True(v.Validate(ValidRequest()).IsValid);
    }

    [Fact]
    public void Rejects_non_canonical_governorate()
    {
        var v = new BuyerAddressUpsertValidator();
        var r = ValidRequest() with { Governorate = "Pluto" };
        Assert.False(v.Validate(r).IsValid);
    }

    [Fact]
    public void Rejects_empty_label()
    {
        var v = new BuyerAddressUpsertValidator();
        var r = ValidRequest() with { Label = "" };
        Assert.False(v.Validate(r).IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("12")]
    [InlineData("letters-not-digits")]
    public void Rejects_invalid_phone(string phone)
    {
        var v = new BuyerAddressUpsertValidator();
        var r = ValidRequest() with { Phone = phone };
        Assert.False(v.Validate(r).IsValid);
    }

    [Fact]
    public void Accepts_optional_fields_null()
    {
        var v = new BuyerAddressUpsertValidator();
        var r = ValidRequest() with { Floor = null, Apartment = null };
        Assert.True(v.Validate(r).IsValid);
    }
}
