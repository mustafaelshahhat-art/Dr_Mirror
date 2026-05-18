using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security;

/// <summary>
/// Pin: <c>SecurityHeadersMiddleware</c> attaches the baseline header set even
/// on streaming responses (<c>Results.Stream</c>). The proof-download
/// endpoint is the canonical streaming consumer.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class SecurityHeadersStreamingTests : IClassFixture<SecurityHeadersStreamingTests.Factory>
{
    private readonly Factory _factory;

    public SecurityHeadersStreamingTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Streaming_proof_download_carries_baseline_headers()
    {
        var owner = await _factory.CreateUserAsync("streaming-headers@example.com");
        var (orderNumber, proofId) = await _factory.SeedOrderWithProofAsync(owner.Id, Factory.ProofFileKey);
        var token = await _factory.IssueAccessTokenAsync(owner.Id, UserRoles.Buyer);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.GetAsync(
            $"/api/orders/{orderNumber}/proof/{proofId}/file",
            HttpCompletionOption.ResponseHeadersRead);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        SecurityHeadersAssertions.AssertBaselineHeaders(response);
    }

    public class Factory : IntegrationWebAppFactory
    {
        public const string ProofFileKey = "payment-proofs/headers-streaming.bin";
        public static readonly byte[] PayloadBytes = [0xDE, 0xAD, 0xBE, 0xEF];

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            foreach (var descriptor in services.Where(d => d.ServiceType == typeof(IFileStorageService)).ToList())
            {
                services.Remove(descriptor);
            }
            services.AddSingleton<IFileStorageService, ByteArrayStorage>();
        }

        private sealed class ByteArrayStorage : IFileStorageService
        {
            public Task<StoredFile> UploadAsync(Stream content, string folder, string originalFileName, string contentType, CancellationToken ct) =>
                Task.FromResult(new StoredFile("/uploads/headers-streaming.bin", ProofFileKey, "application/octet-stream", PayloadBytes.Length));

            public Task DeleteAsync(string fileKey, CancellationToken ct) => Task.CompletedTask;

            public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct) =>
                Task.FromResult<Stream>(new MemoryStream(PayloadBytes, writable: false));
        }
    }
}
