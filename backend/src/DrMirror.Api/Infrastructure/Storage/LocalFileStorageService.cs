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
        // Defense in depth: ALWAYS derive the extension from the validated
        // content-type, never from the caller-supplied filename. A buyer
        // uploading `evil.php` with `image/png` should still land on disk
        // as `<guid>.png`, never `<guid>.php`. The endpoint validates the
        // content-type against an image-only allow-list before we get here.
        // The originalFileName is intentionally unused beyond logging.
        _ = originalFileName;
        var ext = ExtensionFromContentType(contentType);
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
            var full = ResolveUploadPath(fileKey);
            if (File.Exists(full)) File.Delete(full);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local delete failed for {Key}", fileKey);
        }
        return Task.CompletedTask;
    }

    public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct)
    {
        var full = ResolveUploadPath(fileKey);
        Stream stream = new FileStream(full, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true);
        return Task.FromResult(stream);
    }

    private string ResolveUploadPath(string fileKey)
    {
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadRoot = Path.GetFullPath(Path.Combine(webRoot, _opts.LocalDirectory));
        var relativeKey = fileKey
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);

        if (Path.IsPathRooted(relativeKey))
        {
            throw new FileNotFoundException("Stored file key is outside the upload root.", fileKey);
        }

        var full = Path.GetFullPath(Path.Combine(uploadRoot, relativeKey));
        var uploadRootWithSeparator = uploadRoot.EndsWith(Path.DirectorySeparatorChar)
            ? uploadRoot
            : uploadRoot + Path.DirectorySeparatorChar;

        if (!full.StartsWith(uploadRootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            throw new FileNotFoundException("Stored file key is outside the upload root.", fileKey);
        }

        return full;
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
        "image/jpeg"       => ".jpg",
        "image/png"        => ".png",
        "image/webp"       => ".webp",
        "image/heic"       => ".heic",
        "image/heif"       => ".heif",
        _                  => ".bin",
    };
}
