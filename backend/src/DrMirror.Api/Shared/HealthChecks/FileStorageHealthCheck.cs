using DrMirror.Api.Infrastructure.Storage;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DrMirror.Api.Shared.HealthChecks;

public sealed class FileStorageHealthCheck : IHealthCheck
{
    private readonly IFileStorageService _storage;

    public FileStorageHealthCheck(IFileStorageService storage) => _storage = storage;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var key = string.Empty;
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(2));

        try
        {
            await using var input = new MemoryStream([0x44, 0x4d]);
            var stored = await _storage.UploadAsync(input, "healthchecks", "probe.bin", "application/octet-stream", cts.Token);
            key = stored.Key;
            await using var output = await _storage.OpenReadAsync(stored.Key, cts.Token);
            _ = output.ReadByte();
            return HealthCheckResult.Healthy();
        }
        catch (OperationCanceledException ex)
        {
            return HealthCheckResult.Unhealthy("File storage check timed out.", ex);
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("File storage check failed.", ex);
        }
        finally
        {
            if (!string.IsNullOrWhiteSpace(key))
            {
                try { await _storage.DeleteAsync(key, CancellationToken.None); }
                catch { }
            }
        }
    }
}
