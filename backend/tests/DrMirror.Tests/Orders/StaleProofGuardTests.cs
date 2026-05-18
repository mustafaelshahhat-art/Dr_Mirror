using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Orders;

[Collection(IntegrationTestCollection.Name)]
public class StaleProofGuardTests : IClassFixture<StaleProofGuardTests.Factory>
{
    private readonly Factory _factory;

    public StaleProofGuardTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Uploading_second_proof_while_first_is_pending_review_returns_409()
    {
        var buyer = await _factory.CreateUserAsync($"stale-guard-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var orderNumber = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay);
        var token = await _factory.IssueAccessTokenAsync(buyer.Id, UserRoles.Buyer);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 };

        using var firstUpload = new MultipartFormDataContent();
        var firstFile = new ByteArrayContent(jpegBytes);
        firstFile.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        firstUpload.Add(firstFile, "file", "proof.jpg");

        var firstResponse = await client.PostAsync($"/api/orders/{orderNumber}/proof", firstUpload);
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        using var secondUpload = new MultipartFormDataContent();
        var secondFile = new ByteArrayContent(jpegBytes);
        secondFile.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        secondUpload.Add(secondFile, "file", "proof.jpg");

        var secondResponse = await client.PostAsync($"/api/orders/{orderNumber}/proof", secondUpload);
        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        var body = await secondResponse.Content.ReadAsStringAsync();
        Assert.Contains("A payment proof is already pending review", body, StringComparison.OrdinalIgnoreCase);
    }

    public class Factory : IntegrationWebAppFactory
    {
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            foreach (var descriptor in services.Where(d => d.ServiceType == typeof(IFileStorageService)).ToList())
            {
                services.Remove(descriptor);
            }

            services.AddSingleton<IFileStorageService, StaleProofStorageFake>();
        }
    }

    private sealed class StaleProofStorageFake : IFileStorageService
    {
        public Task<StoredFile> UploadAsync(Stream content, string folder, string originalFileName, string contentType, CancellationToken ct) =>
            Task.FromResult(new StoredFile($"/uploads/{folder}/{originalFileName}", $"{folder}/{originalFileName}", contentType, content.Length));

        public Task DeleteAsync(string fileKey, CancellationToken ct) => Task.CompletedTask;

        public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream([0xFF, 0xD8, 0xFF], writable: false));
    }
}
