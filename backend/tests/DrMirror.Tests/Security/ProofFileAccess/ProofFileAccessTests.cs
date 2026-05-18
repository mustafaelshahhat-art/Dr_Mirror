using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security.ProofFileAccess;

[Collection(IntegrationTestCollection.Name)]
public class ProofFileAccessTests : IClassFixture<ProofFileAccessTests.Factory>
{
    private readonly Factory _factory;

    public ProofFileAccessTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Anonymous_static_payment_proof_path_is_blocked()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/uploads/payment-proofs/proof.jpg");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Non_owner_receives_404_from_protected_proof_file_endpoint()
    {
        var owner = await _factory.CreateUserAsync("proof-owner@example.com");
        var otherBuyer = await _factory.CreateUserAsync("proof-other@example.com");
        var (orderNumber, proofId) = await _factory.SeedOrderWithProofAsync(owner.Id, Factory.ProofFileKey);
        var token = await _factory.IssueAccessTokenAsync(otherBuyer.Id, UserRoles.Buyer);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}/proof/{proofId}/file");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Owner_can_stream_their_proof_file()
    {
        var owner = await _factory.CreateUserAsync("proof-owner-stream@example.com");
        var (orderNumber, proofId) = await _factory.SeedOrderWithProofAsync(owner.Id, Factory.ProofFileKey);
        var token = await _factory.IssueAccessTokenAsync(owner.Id, UserRoles.Buyer);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}/proof/{proofId}/file");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(Factory.ProofBytes, await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Admin_can_stream_any_buyers_proof_file()
    {
        var owner = await _factory.CreateUserAsync("proof-admin-owner@example.com");
        var admin = await _factory.CreateUserAsync("proof-admin@example.com", UserRoles.Admin);
        var (orderNumber, proofId) = await _factory.SeedOrderWithProofAsync(owner.Id, Factory.ProofFileKey);
        var token = await _factory.IssueAccessTokenAsync(admin.Id, UserRoles.Admin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}/proof/{proofId}/file");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(Factory.ProofBytes, await response.Content.ReadAsByteArrayAsync());
    }

    public class Factory : IntegrationWebAppFactory
    {
        public const string ProofFileKey = "payment-proofs/test-proof.jpg";
        public static readonly byte[] ProofBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            foreach (var descriptor in services.Where(d => d.ServiceType == typeof(IFileStorageService)).ToList())
            {
                services.Remove(descriptor);
            }

            services.AddSingleton<IFileStorageService, ProofFileStorageFake>();
        }
    }

    private sealed class ProofFileStorageFake : IFileStorageService
    {
        public Task<StoredFile> UploadAsync(Stream content, string folder, string originalFileName, string contentType, CancellationToken ct) =>
            Task.FromResult(new StoredFile("/uploads/payment-proofs/test-proof.jpg", Factory.ProofFileKey, "image/jpeg", Factory.ProofBytes.Length));

        public Task DeleteAsync(string fileKey, CancellationToken ct) => Task.CompletedTask;

        public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream(Factory.ProofBytes, writable: false));
    }
}
