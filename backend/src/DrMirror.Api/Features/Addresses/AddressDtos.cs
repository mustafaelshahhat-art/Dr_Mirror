using DrMirror.Api.Domain.Catalog;
using FluentValidation;

namespace DrMirror.Api.Features.Addresses;

public sealed record BuyerAddressDto(
    Guid Id,
    string Label,
    string RecipientName,
    string Phone,
    string Governorate,
    string City,
    string StreetAddress,
    string? Floor,
    string? Apartment,
    string? Landmark,
    string? Notes,
    bool IsDefault,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record BuyerAddressUpsertRequest(
    string Label,
    string RecipientName,
    string Phone,
    string Governorate,
    string City,
    string StreetAddress,
    string? Floor,
    string? Apartment,
    string? Landmark,
    string? Notes,
    bool SetDefault);

public sealed class BuyerAddressUpsertValidator : AbstractValidator<BuyerAddressUpsertRequest>
{
    private static readonly System.Text.RegularExpressions.Regex PhoneRegex =
        new(@"^\+?\d[\d\s\-]{8,18}\d$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public BuyerAddressUpsertValidator()
    {
        RuleFor(r => r.Label).NotEmpty().MaximumLength(64);
        RuleFor(r => r.RecipientName).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Phone)
            .NotEmpty()
            .Must(p => PhoneRegex.IsMatch(p)).WithMessage("Phone number is not valid.");
        RuleFor(r => r.Governorate)
            .NotEmpty()
            .MaximumLength(100)
            .Must(Governorates.IsValid)
            .WithMessage("Governorate must be one of the 27 Egyptian governorates.");
        RuleFor(r => r.City).NotEmpty().MaximumLength(100);
        RuleFor(r => r.StreetAddress).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Floor).MaximumLength(50);
        RuleFor(r => r.Apartment).MaximumLength(50);
        RuleFor(r => r.Landmark).MaximumLength(200);
        RuleFor(r => r.Notes).MaximumLength(500);
    }
}

public static class AddressLimits
{
    /// <summary>Soft cap on how many addresses a single buyer can keep — sanity, not security.</summary>
    public const int MaxAddressesPerUser = 20;
}
