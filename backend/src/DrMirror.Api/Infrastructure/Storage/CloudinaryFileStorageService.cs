using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using DrMirror.Api.Shared.ExternalServices;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.Storage;

/// <summary>
/// Production file storage backed by Cloudinary streaming upload. The buyer's
/// browser PUTs the file at us → we PUT it to Cloudinary → we save the
/// returned secure URL + public_id in the DB.
/// </summary>
public sealed class CloudinaryFileStorageService : IFileStorageService
{
    private readonly Cloudinary _cloudinary;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CloudinaryFileStorageService> _logger;

    public CloudinaryFileStorageService(
        IOptions<FileStorageOptions> opts,
        IHttpClientFactory httpClientFactory,
        ILogger<CloudinaryFileStorageService> logger)
    {
        _httpClientFactory = httpClientFactory;
        var o = opts.Value;
        if (string.IsNullOrWhiteSpace(o.CloudinaryCloudName)
            || string.IsNullOrWhiteSpace(o.CloudinaryApiKey)
            || string.IsNullOrWhiteSpace(o.CloudinaryApiSecret))
        {
            throw new InvalidOperationException(
                "Cloudinary credentials are missing — set FileStorage:CloudinaryCloudName / ApiKey / ApiSecret " +
                "or switch FileStorage:Provider back to 'local'.");
        }

        _cloudinary = new Cloudinary(new Account(
            o.CloudinaryCloudName,
            o.CloudinaryApiKey,
            o.CloudinaryApiSecret));
        _cloudinary.Api.Secure = true;
        _logger = logger;
    }

    public async Task<StoredFile> UploadAsync(
        Stream content,
        string folder,
        string originalFileName,
        string contentType,
        CancellationToken ct)
    {
        var isPaymentProof = folder.StartsWith("payment-proofs/", StringComparison.OrdinalIgnoreCase);
        var publicId = $"{folder}/{Guid.NewGuid():n}";
        var upload = new ImageUploadParams
        {
            File = new FileDescription(originalFileName, content),
            PublicId = publicId,
            Folder = folder,
            Type = isPaymentProof ? "authenticated" : "upload",
            UseFilename = false,
            UniqueFilename = false,
            Overwrite = false,
        };

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(10));

        UploadResult result;
        try
        {
            result = await _cloudinary.UploadAsync(upload, timeoutCts.Token);
        }
        catch (OperationCanceledException ex) when (!ct.IsCancellationRequested)
        {
            throw new ExternalServiceUnavailableException("Cloudinary upload timed out after 10 seconds.", ex);
        }
        if (result.Error is not null)
        {
            throw new InvalidOperationException(
                $"Cloudinary upload failed: {result.Error.Message}");
        }

        return new StoredFile(
            Url: result.SecureUrl?.ToString() ?? result.Url.ToString(),
            Key: result.PublicId,
            ContentType: contentType,
            SizeBytes: result.Bytes);
    }

    public async Task DeleteAsync(string fileKey, CancellationToken ct)
    {
        try
        {
            await _cloudinary.DestroyAsync(new DeletionParams(fileKey));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cloudinary destroy failed for {Key}", fileKey);
            throw;
        }
    }

    public async Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct)
    {
        var urlBuilder = _cloudinary.Api.UrlImgUp.Secure(true);
        if (fileKey.StartsWith("payment-proofs/", StringComparison.OrdinalIgnoreCase))
        {
            urlBuilder = urlBuilder.Type("authenticated").Signed(true);
        }
        var url = urlBuilder.BuildUrl(fileKey);
        var http = _httpClientFactory.CreateClient(nameof(CloudinaryFileStorageService));
        // Stream the response body directly to the caller without buffering the
        // entire payload in API memory. The caller (e.g. Results.Stream) owns
        // disposal of the returned stream.
        try
        {
            return await http.GetStreamAsync(url, ct);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            throw new ExternalServiceUnavailableException("Cloudinary file read timed out after 10 seconds.", ex);
        }
    }
}
