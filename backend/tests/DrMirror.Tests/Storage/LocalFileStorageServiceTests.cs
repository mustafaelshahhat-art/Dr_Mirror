using DrMirror.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Storage;

public class LocalFileStorageServiceTests
{
    [Fact]
    public async Task OpenReadAsync_reads_files_under_upload_root()
    {
        using var temp = new TempDirectory();
        var webRoot = Path.Combine(temp.Path, "wwwroot");
        var proofDirectory = Path.Combine(webRoot, "uploads", "payment-proofs", "DM-TEST");
        Directory.CreateDirectory(proofDirectory);
        await File.WriteAllBytesAsync(Path.Combine(proofDirectory, "proof.jpg"), [1, 2, 3]);

        var storage = CreateStorage(webRoot, temp.Path);

        await using var stream = await storage.OpenReadAsync("payment-proofs/DM-TEST/proof.jpg", CancellationToken.None);
        using var output = new MemoryStream();
        await stream.CopyToAsync(output);

        Assert.Equal([1, 2, 3], output.ToArray());
    }

    [Fact]
    public async Task OpenReadAsync_rejects_keys_outside_upload_root()
    {
        using var temp = new TempDirectory();
        var webRoot = Path.Combine(temp.Path, "wwwroot");
        Directory.CreateDirectory(Path.Combine(webRoot, "uploads"));
        await File.WriteAllTextAsync(Path.Combine(temp.Path, "secret.txt"), "not a proof");

        var storage = CreateStorage(webRoot, temp.Path);

        await Assert.ThrowsAsync<FileNotFoundException>(() =>
            storage.OpenReadAsync("../secret.txt", CancellationToken.None));
    }

    private static LocalFileStorageService CreateStorage(string webRoot, string contentRoot) => new(
        new TestWebHostEnvironment(webRoot, contentRoot),
        Options.Create(new FileStorageOptions()),
        NullLogger<LocalFileStorageService>.Instance);

    private sealed class TempDirectory : IDisposable
    {
        public TempDirectory()
        {
            Path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), $"drmirror-tests-{Guid.NewGuid():n}");
            Directory.CreateDirectory(Path);
        }

        public string Path { get; }

        public void Dispose()
        {
            if (Directory.Exists(Path)) Directory.Delete(Path, recursive: true);
        }
    }

    private sealed class TestWebHostEnvironment(string webRootPath, string contentRootPath) : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = webRootPath;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ApplicationName { get; set; } = "DrMirror.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = contentRootPath;
        public string EnvironmentName { get; set; } = "Testing";
    }
}
