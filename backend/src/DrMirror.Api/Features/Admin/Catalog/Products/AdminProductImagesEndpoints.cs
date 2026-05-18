using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Api.Shared.Auditing;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Features.Admin.Catalog.Products;

public sealed record AdminProductImageUpdateRequest(string? Alt, int DisplayOrder);

public sealed class AdminProductImageUpdateValidator : AbstractValidator<AdminProductImageUpdateRequest>
{
    public AdminProductImageUpdateValidator()
    {
        RuleFor(r => r.Alt).MaximumLength(180);
        RuleFor(r => r.DisplayOrder).InclusiveBetween(0, 999);
    }
}

/// <summary>
/// Product gallery management. Uploads route through <c>IFileStorageService</c>
/// (local in dev, Cloudinary in prod). Delete removes both the DB row AND the
/// underlying blob via <c>FileKey</c>.
/// </summary>
public static class AdminProductImagesEndpoints
{
    private static readonly Dictionary<string, byte[]> MagicBytes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            { "image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF } },
            { "image/png", new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
            { "image/webp", new byte[] { 0x52, 0x49, 0x46, 0x46 } },
        };

    private static bool HasValidMagicBytes(Stream stream, string contentType)
    {
        if (contentType.Equals("image/heic", StringComparison.OrdinalIgnoreCase) ||
            contentType.Equals("image/heif", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!MagicBytes.TryGetValue(contentType, out var magic)) return false;
        Span<byte> header = stackalloc byte[magic.Length];
        int read = stream.Read(header);
        stream.Position = 0;
        return read == magic.Length && header.SequenceEqual(magic);
    }

    public static RouteGroupBuilder MapAdminProductImages(this RouteGroupBuilder group)
    {
        group.MapPost("/{productId:guid}/images", Upload)
            .WithName("Admin.Products.UploadImage")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .DisableAntiforgery() // bearer-token API
            .Produces<AdminProductImageDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status415UnsupportedMediaType);

        group.MapPut("/{productId:guid}/images/{imageId:guid}", Update)
            .WithName("Admin.Products.UpdateImage")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminProductImageUpdateRequest>()
            .Produces<AdminProductImageDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{productId:guid}/images/{imageId:guid}", Delete)
            .WithName("Admin.Products.DeleteImage")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> Upload(
        Guid productId,
        IFormFile file,
        AppDbContext db,
        IAdminAuditWriter audit,
        [FromServices] IFileStorageService storage,
        [FromServices] IOptions<FileStorageOptions> opts,
        CancellationToken ct)
    {
        var product = await db.Products.FindAsync(new object[] { productId }, ct);
        if (product is null)
        {
            return Results.Problem(title: "Product not found", statusCode: StatusCodes.Status404NotFound);
        }

        if (file is null || file.Length == 0)
        {
            return Results.Problem(
                title: "No file provided",
                detail: "Attach the image as the `file` multipart field.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var o = opts.Value;
        if (file.Length > o.MaxFileSizeBytes)
        {
            return Results.Problem(
                title: "File too large",
                detail: $"Maximum allowed size is {o.MaxFileSizeBytes / 1024 / 1024} MB.",
                statusCode: StatusCodes.Status400BadRequest);
        }
        if (!o.ProductImageContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return Results.Problem(
                title: "Unsupported file type",
                detail: $"Upload a JPEG, PNG, WebP, or HEIC image (received {file.ContentType}).",
                statusCode: StatusCodes.Status415UnsupportedMediaType);
        }

        StoredFile stored;
        await using (var ms = new MemoryStream())
        {
            await file.OpenReadStream().CopyToAsync(ms, ct);
            ms.Position = 0;
            if (!HasValidMagicBytes(ms, file.ContentType))
            {
                return Results.Problem(
                    title: "File content does not match declared type",
                    detail: "The uploaded file's content does not match its declared content-type.",
                    statusCode: StatusCodes.Status415UnsupportedMediaType);
            }

            ms.Position = 0;
            stored = await storage.UploadAsync(
                ms,
                folder: $"products/{productId}",
                originalFileName: file.FileName,
                contentType: file.ContentType,
                ct);
        }

        // Append to the end of the gallery — the admin can reorder afterwards.
        var nextOrder = await db.ProductImages
            .Where(i => i.ProductId == productId)
            .Select(i => (int?)i.DisplayOrder)
            .MaxAsync(ct) ?? -1;

        var entity = new ProductImage
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Url = stored.Url,
            FileKey = stored.Key,
            ContentType = stored.ContentType,
            SizeBytes = stored.SizeBytes,
            DisplayOrder = nextOrder + 1,
        };

        db.ProductImages.Add(entity);
        await audit.WriteAsync("Product.Update", "ProductImage", entity.Id.ToString(), null, "Created", ct);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/admin/products/{productId}/images/{entity.Id}", ToDto(entity));
    }

    private static async Task<IResult> Update(
        Guid productId,
        Guid imageId,
        AdminProductImageUpdateRequest request,
        AppDbContext db,
        IAdminAuditWriter audit,
        CancellationToken ct)
    {
        var entity = await db.ProductImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == productId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Image not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.Alt = string.IsNullOrWhiteSpace(request.Alt) ? null : request.Alt.Trim();
        entity.DisplayOrder = request.DisplayOrder;

        await audit.WriteAsync("Product.Update", "ProductImage", entity.Id.ToString(), null, null, ct);
        await db.SaveChangesAsync(ct);
        return Results.Ok(ToDto(entity));
    }

    private static async Task<IResult> Delete(
        Guid productId,
        Guid imageId,
        AppDbContext db,
        IAdminAuditWriter audit,
        [FromServices] IFileStorageService storage,
        CancellationToken ct)
    {
        var entity = await db.ProductImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == productId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Image not found", statusCode: StatusCodes.Status404NotFound);
        }

        // Drop the blob FIRST — orphaned blobs are worse than orphaned DB rows
        // because the latter can be cleaned up by a maintenance task and the
        // former leak storage cost. Delete is best-effort (never throws), so
        // the DB row gets removed regardless.
        if (!string.IsNullOrWhiteSpace(entity.FileKey))
        {
            await storage.DeleteAsync(entity.FileKey, ct);
        }

        db.ProductImages.Remove(entity);
        await audit.WriteAsync("Product.Update", "ProductImage", entity.Id.ToString(), "Present", "Deleted", ct);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }

    private static AdminProductImageDto ToDto(ProductImage i) => new(
        i.Id, i.Url, i.Alt, i.DisplayOrder,
        i.FileKey, i.ContentType, i.SizeBytes,
        i.CreatedAt);
}
