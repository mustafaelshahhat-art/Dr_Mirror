using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.Storage;

/// <summary>
/// Dev / single-instance file storage backed by the local filesystem under
/// <c>wwwroot/&lt;LocalDirectory&gt;</c>. The directory is served as static
/// files by ASP.NET so the URL is directly fetchable by the SPA.
/// </summary>
/// <remarks>
/// Never use in horizontally-scaled prod — files on one instance won't be
/// visible from another. Cloudinary is the right pick for that environment.
/// </remarks>
public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly FileStorageOptions _opts;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(
        IWebHostEnvironment env,
        IOptions<FileStorageOptions> opts,
        ILogger<LocalFileStorageService> logger)
    {
        _env = env;
        _opts = opts.Value;
        _logger = logger;
    }

    public async Task<StoredFile> UploadAsync(
        Stream content,
        string folder,
        string originalFileName,
        string contentType,
        CancellationToken ct)
    {
        var safeFolder = SanitiseFolder(folder);
        var ext = Path.GetExtension(originalFileName);
        if (string.IsNullOrWhiteSpace(ext)) ext = ExtensionFromContentType(contentType);
        var safeName = $"{Guid.NewGuid():n}{ext}";

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var targetDir = Path.Combine(webRoot, _opts.LocalDirectory, safeFolder);
        Directory.CreateDirectory(targetDir);

        var targetPath = Path.Combine(targetDir, safeName);
        await using (var output = File.Create(targetPath))
        {
            await content.CopyToAsync(output, ct);
        }

        var size = new FileInfo(targetPath).Length;
        var publicUrl = $"{_opts.LocalPublicBaseUrl.TrimEnd('/')}/{safeFolder}/{safeName}";
        var key = $"{safeFolder}/{safeName}"; // used by DeleteAsync to find the file

        _logger.LogInformation(
            "Stored {Bytes} bytes at {Path} (public {Url})",
            size, targetPath, publicUrl);

        return new StoredFile(publicUrl, key, contentType, size);
    }

    public Task DeleteAsync(string fileKey, CancellationToken ct)
    {
        try
        {
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var full = Path.Combine(webRoot, _opts.LocalDirectory, fileKey.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(full)) File.Delete(full);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local delete failed for {Key}", fileKey);
        }
        return Task.CompletedTask;
    }

    private static string SanitiseFolder(string folder)
    {
        // Strip any path-walking attempts and collapse to ASCII-safe slug parts.
        var parts = folder.Split(['/', '\\'], StringSplitOptions.RemoveEmptyEntries)
            .Select(p => string.Concat(p.Where(c => char.IsLetterOrDigit(c) || c is '-' or '_')))
            .Where(p => p.Length > 0);
        return string.Join('/', parts);
    }

    private static string ExtensionFromContentType(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        "image/heic" => ".heic",
        "image/heif" => ".heif",
        _ => ".bin",
    };
}
