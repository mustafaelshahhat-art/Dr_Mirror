using System.ComponentModel.DataAnnotations;

namespace DrMirror.Api.Infrastructure.Storage;

/// <summary>
/// Storage-provider configuration. Bound from the <c>FileStorage</c> section.
/// </summary>
public sealed class FileStorageOptions : IValidatableObject
{
    public const string SectionName = "FileStorage";

    /// <summary><c>local</c> (default, dev) or <c>cloudinary</c>.</summary>
    [Required]
    public string Provider { get; set; } = "local";

    /// <summary>
    /// For the local provider: directory under <c>wwwroot</c> that gets served
    /// as static files. Defaults to <c>uploads</c>.
    /// </summary>
    public string LocalDirectory { get; set; } = "uploads";

    /// <summary>
    /// For the local provider: base URL the SPA can hit to fetch the uploaded
    /// file. Defaults to <c>/uploads</c> (served statically by the API).
    /// </summary>
    public string LocalPublicBaseUrl { get; set; } = "/uploads";

    /// <summary>
    /// Maximum upload size in bytes. Default: 10 MB.
    /// Reasonable for screenshots of bank-transfer receipts.
    /// </summary>
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Backwards-compatible proof upload allow-list. Product images use
    /// <see cref="ProductImageContentTypes"/> and intentionally exclude PDFs.
    /// </summary>
    public string[] AllowedContentTypes { get; set; } = new[]
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "application/pdf",
    };

    public string[] PaymentProofContentTypes { get; set; } = new[]
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "application/pdf",
    };

    public string[] ProductImageContentTypes { get; set; } = new[]
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    };

    // -- Cloudinary-specific. --
    public string? CloudinaryCloudName { get; set; }
    public string? CloudinaryApiKey { get; set; }
    public string? CloudinaryApiSecret { get; set; }

    private static readonly HashSet<string> KnownProviders =
        new(StringComparer.OrdinalIgnoreCase) { "local", "cloudinary" };

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!KnownProviders.Contains(Provider))
        {
            yield return new ValidationResult(
                $"Unknown FileStorage:Provider '{Provider}'. Valid values: local, cloudinary.");
            yield break;
        }

        if (Provider.Equals("cloudinary", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(CloudinaryCloudName) ||
                string.IsNullOrWhiteSpace(CloudinaryApiKey) ||
                string.IsNullOrWhiteSpace(CloudinaryApiSecret))
            {
                yield return new ValidationResult(
                    "Cloudinary credentials are missing — set FileStorage:CloudinaryCloudName / ApiKey / ApiSecret " +
                    "or switch FileStorage:Provider back to 'local'.");
            }
        }
    }
}
