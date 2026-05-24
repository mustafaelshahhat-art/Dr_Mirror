using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.RateLimiting;
using DrMirror.Api.Shared.Validation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Addresses;

/// <summary>
/// Buyer address book under <c>/api/addresses</c>. Owned per-user, hard-delete
/// is safe because orders snapshot the address inline at checkout time.
/// </summary>
public static class AddressEndpoints
{
    public static IEndpointRouteBuilder MapAddressEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/addresses").WithTags("Addresses");

        group.MapGet("/", List)
            .WithName("Addresses.List")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .Produces<IReadOnlyList<BuyerAddressDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", Get)
            .WithName("Addresses.Get")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .Produces<BuyerAddressDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithName("Addresses.Create")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .WithValidation<BuyerAddressUpsertRequest>()
            .Produces<BuyerAddressDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", Update)
            .WithName("Addresses.Update")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .WithValidation<BuyerAddressUpsertRequest>()
            .Produces<BuyerAddressDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", Delete)
            .WithName("Addresses.Delete")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/set-default", SetDefault)
            .WithName("Addresses.SetDefault")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .Produces<BuyerAddressDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }

    // --------------------------------------------------------------------------

    private static async Task<IResult> List(ICurrentUser current, AppDbContext db, CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();

        var rows = await db.BuyerAddresses
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.UpdatedAt)
            .ToListAsync(ct);

        return Results.Ok(rows.Select(ToDto).ToList());
    }

    private static async Task<IResult> Get(
        Guid id,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();
        var row = await db.BuyerAddresses
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
        return row is null
            ? Results.Problem(title: "Address not found", statusCode: StatusCodes.Status404NotFound)
            : Results.Ok(ToDto(row));
    }

    private static async Task<IResult> Create(
        BuyerAddressUpsertRequest request,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();

        var existingCount = await db.BuyerAddresses.CountAsync(a => a.UserId == userId, ct);
        if (existingCount >= AddressLimits.MaxAddressesPerUser)
        {
            return Results.Problem(
                title: "Address book is full",
                detail: $"You can keep at most {AddressLimits.MaxAddressesPerUser} saved addresses.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // First-ever address is implicitly the default, even if SetDefault wasn't asked for.
        var makeDefault = request.SetDefault || existingCount == 0;
        if (makeDefault)
        {
            await ClearOtherDefaults(db, userId, exceptId: null, ct);
        }

        var entity = ToEntity(request, userId);
        entity.Id = Guid.NewGuid();
        entity.IsDefault = makeDefault;
        db.BuyerAddresses.Add(entity);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Concurrent request won the unique-default race; caller should retry.
            return Results.Problem(
                title: "Concurrent update conflict",
                detail: "Another request updated your default address at the same time. Please retry.",
                statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Created($"/api/addresses/{entity.Id}", ToDto(entity));
    }

    private static async Task<IResult> Update(
        Guid id,
        BuyerAddressUpsertRequest request,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();

        var entity = await db.BuyerAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Address not found", statusCode: StatusCodes.Status404NotFound);
        }

        var becomingDefault = request.SetDefault && !entity.IsDefault;
        if (becomingDefault)
        {
            await ClearOtherDefaults(db, userId, exceptId: entity.Id, ct);
        }

        ApplyUpsert(entity, request);
        if (becomingDefault) entity.IsDefault = true;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Results.Problem(
                title: "Concurrent update conflict",
                detail: "Another request updated your default address at the same time. Please retry.",
                statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Ok(ToDto(entity));
    }

    private static async Task<IResult> Delete(
        Guid id,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();
        var entity = await db.BuyerAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Address not found", statusCode: StatusCodes.Status404NotFound);
        }

        db.BuyerAddresses.Remove(entity);

        // If the deleted address was the default, promote the most-recently-updated
        // remaining address so the buyer always has a sensible pre-fill at checkout.
        if (entity.IsDefault)
        {
            var nextDefault = await db.BuyerAddresses
                .Where(a => a.UserId == userId && a.Id != entity.Id)
                .OrderByDescending(a => a.UpdatedAt)
                .FirstOrDefaultAsync(ct);
            if (nextDefault is not null)
            {
                nextDefault.IsDefault = true;
                nextDefault.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> SetDefault(
        Guid id,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();
        var entity = await db.BuyerAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Address not found", statusCode: StatusCodes.Status404NotFound);
        }

        if (!entity.IsDefault)
        {
            try
            {
                await using var transaction = db.Database.IsRelational()
                    ? await db.Database.BeginTransactionAsync(ct)
                    : null;

                await ClearOtherDefaults(db, userId, exceptId: entity.Id, ct);
                entity.IsDefault = true;
                entity.UpdatedAt = DateTimeOffset.UtcNow;

                await db.SaveChangesAsync(ct);
                if (transaction is not null)
                {
                    await transaction.CommitAsync(ct);
                }
            }
            catch (DbUpdateException)
            {
                return Results.Problem(
                    title: "Concurrent update conflict",
                    detail: "Another request updated your default address at the same time. Please retry.",
                    statusCode: StatusCodes.Status409Conflict);
            }
        }
        return Results.Ok(ToDto(entity));
    }

    // --------------------------------------------------------------------------

    private static async Task ClearOtherDefaults(
        AppDbContext db,
        Guid userId,
        Guid? exceptId,
        CancellationToken ct)
    {
        var others = await db.BuyerAddresses
            .Where(a => a.UserId == userId && a.IsDefault && (exceptId == null || a.Id != exceptId))
            .ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;
        foreach (var o in others)
        {
            o.IsDefault = false;
            o.UpdatedAt = now;
        }
    }

    private static BuyerAddress ToEntity(BuyerAddressUpsertRequest r, Guid userId) => new()
    {
        UserId = userId,
        Label = r.Label.Trim(),
        RecipientName = r.RecipientName.Trim(),
        Phone = r.Phone.Trim(),
        Governorate = Governorates.Normalize(r.Governorate),
        City = r.City.Trim(),
        StreetAddress = r.StreetAddress.Trim(),
        Floor = string.IsNullOrWhiteSpace(r.Floor) ? null : r.Floor.Trim(),
        Apartment = string.IsNullOrWhiteSpace(r.Apartment) ? null : r.Apartment.Trim(),
        Landmark = string.IsNullOrWhiteSpace(r.Landmark) ? null : r.Landmark.Trim(),
        Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim(),
    };

    private static void ApplyUpsert(BuyerAddress entity, BuyerAddressUpsertRequest r)
    {
        entity.Label = r.Label.Trim();
        entity.RecipientName = r.RecipientName.Trim();
        entity.Phone = r.Phone.Trim();
        entity.Governorate = Governorates.Normalize(r.Governorate);
        entity.City = r.City.Trim();
        entity.StreetAddress = r.StreetAddress.Trim();
        entity.Floor = string.IsNullOrWhiteSpace(r.Floor) ? null : r.Floor.Trim();
        entity.Apartment = string.IsNullOrWhiteSpace(r.Apartment) ? null : r.Apartment.Trim();
        entity.Landmark = string.IsNullOrWhiteSpace(r.Landmark) ? null : r.Landmark.Trim();
        entity.Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim();
    }

    private static BuyerAddressDto ToDto(BuyerAddress a) => new(
        a.Id, a.Label, a.RecipientName, a.Phone, a.Governorate, a.City, a.StreetAddress,
        a.Floor, a.Apartment, a.Landmark, a.Notes, a.IsDefault, a.CreatedAt, a.UpdatedAt);
}
