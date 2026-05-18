using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Storage;

/// <summary>
/// Verifies the payment-proof download endpoint streams from the storage layer
/// without buffering the full payload in API memory. The fake
/// <see cref="StreamingProofStorage"/> hands back a 5 MB lazily-generated
/// stream — any code path that calls <c>GetByteArrayAsync</c> or otherwise
/// copies into a <c>MemoryStream</c> would inflate working-set noticeably.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class PaymentProofStreamingTests : IClassFixture<PaymentProofStreamingTests.Factory>
{
    private readonly Factory _factory;

    public PaymentProofStreamingTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Five_megabyte_proof_download_stays_within_memory_budget()
    {
        var owner = await _factory.CreateUserAsync("proof-streaming@example.com");
        var (orderNumber, proofId) = await _factory.SeedOrderWithProofAsync(owner.Id, Factory.ProofFileKey);
        var token = await _factory.IssueAccessTokenAsync(owner.Id, UserRoles.Buyer);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Warm-up GC so the baseline is steady.
        var baseline = GC.GetTotalMemory(forceFullCollection: true);

        using var response = await client.GetAsync(
            $"/api/orders/{orderNumber}/proof/{proofId}/file",
            HttpCompletionOption.ResponseHeadersRead);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await using var body = await response.Content.ReadAsStreamAsync();

        // Drain in a small fixed buffer — never materialize the full payload.
        var buffer = new byte[8 * 1024];
        long total = 0;
        int read;
        while ((read = await body.ReadAsync(buffer)) > 0)
        {
            total += read;
        }

        Assert.Equal(StreamingProofStorage.PayloadSize, total);

        var peakDelta = GC.GetTotalMemory(forceFullCollection: false) - baseline;
        // 5 MB payload. The TestServer pipeline buffers more than a real
        // HTTP host, so this threshold is a coarse regression guard against
        // accidentally re-introducing `GetByteArrayAsync` + `MemoryStream`
        // copies in the storage layer (which would double the budget to
        // ~10–12 MB end-to-end). Anything under one extra full payload's
        // worth of working-set is acceptable in this harness.
        Assert.True(peakDelta < 8 * 1024 * 1024,
            $"Streaming proof inflated working set by {peakDelta:N0} bytes; expected < 8,388,608.");
    }

    [Fact]
    public async Task Unauthenticated_proof_download_returns_401()
    {
        var response = await _factory.CreateClient().GetAsync(
            "/api/orders/DOESNOTEXIST/proof/00000000-0000-0000-0000-000000000000/file");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    public class Factory : IntegrationWebAppFactory
    {
        public const string ProofFileKey = "payment-proofs/streaming-proof.bin";

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            foreach (var descriptor in services.Where(d => d.ServiceType == typeof(IFileStorageService)).ToList())
            {
                services.Remove(descriptor);
            }
            services.AddSingleton<IFileStorageService, StreamingProofStorage>();
        }
    }

    private sealed class StreamingProofStorage : IFileStorageService
    {
        // 5 MB sized payload exercised in the streaming test.
        public const int PayloadSize = 5 * 1024 * 1024;

        public Task<StoredFile> UploadAsync(Stream content, string folder, string originalFileName, string contentType, CancellationToken ct) =>
            Task.FromResult(new StoredFile("/uploads/streaming-proof.bin", Factory.ProofFileKey, "application/octet-stream", PayloadSize));

        public Task DeleteAsync(string fileKey, CancellationToken ct) => Task.CompletedTask;

        public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct) =>
            Task.FromResult<Stream>(new LazyFiveMbStream());
    }

    private sealed class LazyFiveMbStream : Stream
    {
        private long _position;
        private readonly long _length = StreamingProofStorage.PayloadSize;

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => _length;
        public override long Position
        {
            get => _position;
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            var remaining = _length - _position;
            if (remaining <= 0) return 0;
            var toWrite = (int)Math.Min(count, remaining);
            // Fill with a deterministic byte pattern without allocating large arrays.
            for (var i = 0; i < toWrite; i++)
            {
                buffer[offset + i] = (byte)((_position + i) & 0xFF);
            }
            _position += toWrite;
            return toWrite;
        }

        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
