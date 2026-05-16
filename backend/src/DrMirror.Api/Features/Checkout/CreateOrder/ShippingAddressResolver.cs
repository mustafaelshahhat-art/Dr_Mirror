using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Checkout.CreateOrder;

internal static class ShippingAddressResolver
{
    /// <summary>
    /// Resolves a <see cref="ShippingAddress"/> value object from either a saved address ID
    /// or an inline <see cref="ShippingAddressDto"/>. Returns a non-null error result on failure.
    /// </summary>
    internal static async Task<(ShippingAddress? Address, IResult? Error)> ResolveAsync(
        Guid? savedAddressId,
        ShippingAddressDto? inline,
        Guid userId,
        AppDbContext db,
        CancellationToken ct)
    {
        if (savedAddressId is { } addrId)
        {
            var saved = await db.BuyerAddresses
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == addrId && a.UserId == userId, ct);

            if (saved is null)
            {
                return (null, Results.Problem(
                    title: "Saved address not found",
                    detail: "The selected address was not found in your address book.",
                    statusCode: StatusCodes.Status404NotFound));
            }

            return (new ShippingAddress
            {
                RecipientName = saved.RecipientName,
                Phone = saved.Phone,
                Governorate = saved.Governorate,
                City = saved.City,
                StreetAddress = saved.StreetAddress,
                Floor = saved.Floor,
                Apartment = saved.Apartment,
                Landmark = saved.Landmark,
                Notes = saved.Notes,
            }, null);
        }

        // Validator guarantees ShippingAddress is non-null when BuyerAddressId is absent.
        return (new ShippingAddress
        {
            RecipientName = inline!.RecipientName.Trim(),
            Phone = inline.Phone.Trim(),
            Governorate = Governorates.Normalize(inline.Governorate),
            City = inline.City.Trim(),
            StreetAddress = inline.StreetAddress.Trim(),
            Floor = inline.Floor?.Trim(),
            Apartment = inline.Apartment?.Trim(),
            Landmark = inline.Landmark?.Trim(),
            Notes = inline.Notes?.Trim(),
        }, null);
    }
}
