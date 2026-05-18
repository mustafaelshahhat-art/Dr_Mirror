namespace DrMirror.Api.Infrastructure.Storage;

/// <summary>
/// Abstraction over "store an uploaded file somewhere durable and give me back
/// a URL". Has two implementations:
/// <list type="bullet">
///   <item><see cref="LocalFileStorageService"/> — dev: writes under <c>wwwroot/uploads</c>.</item>
///   <item><see cref="CloudinaryFileStorageService"/> — prod: Cloudinary streaming upload.</item>
/// </list>
/// Selected via <c>FileStorage:Provider</c> config (<c>local</c> | <c>cloudinary</c>).
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Persist <paramref name="content"/> under the logical <paramref name="folder"/>
    /// (e.g. <c>payment-proofs/DM-2026-000001</c>). Returns the public URL and a
    /// driver-specific key that the caller can save in the DB for later deletion.
    /// </summary>
    Task<StoredFile> UploadAsync(
        Stream content,
        string folder,
        string originalFileName,
        string contentType,
        CancellationToken ct);

    /// <summary>
    /// Best-effort delete. Missing files are treated as success; storage failures
    /// other than <see cref="FileNotFoundException"/> and <see cref="DirectoryNotFoundException"/> are surfaced to the caller.
    /// </summary>
    Task DeleteAsync(string fileKey, CancellationToken ct);

    /// <summary>
    /// Returns a readable stream for the file identified by <paramref name="fileKey"/>.
    /// Caller is responsible for disposing the stream.
    /// Used by the authenticated proof-streaming endpoint.
    /// </summary>
    Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct);
}

/// <summary>The result of a successful upload.</summary>
public sealed record StoredFile(
    string Url,
    string Key,
    string ContentType,
    long SizeBytes);
