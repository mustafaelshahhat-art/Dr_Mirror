using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Orders.ProofValidation;

[Collection(IntegrationTestCollection.Name)]
public class ProofUploadValidationTests : IClassFixture<ProofUploadValidationTests.Factory>
{
    private readonly Factory _factory;

    public ProofUploadValidationTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Six_mb_proof_upload_returns_413()
    {
        var (client, orderNumber) = await CreateAuthenticatedOrderClientAsync();
        using var content = Multipart(new byte[6 * 1024 * 1024], "image/jpeg", "proof.jpg");

        var response = await client.PostAsync($"/api/orders/{orderNumber}/proof", content);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task Exe_renamed_to_jpg_returns_415_for_magic_byte_mismatch()
    {
        var (client, orderNumber) = await CreateAuthenticatedOrderClientAsync();
        using var content = Multipart([0x4D, 0x5A, 0x00, 0x00], "image/jpeg", "proof.jpg");

        var response = await client.PostAsync($"/api/orders/{orderNumber}/proof", content);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Fact]
    public async Task Valid_four_mb_jpeg_upload_returns_200()
    {
        var (client, orderNumber) = await CreateAuthenticatedOrderClientAsync();
        var bytes = new byte[4 * 1024 * 1024];
        bytes[0] = 0xFF;
        bytes[1] = 0xD8;
        bytes[2] = 0xFF;
        bytes[3] = 0xE0;
        using var content = Multipart(bytes, "image/jpeg", "proof.jpg");

        var response = await client.PostAsync($"/api/orders/{orderNumber}/proof", content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<(HttpClient Client, string OrderNumber)> CreateAuthenticatedOrderClientAsync()
    {
        var buyer = await _factory.CreateUserAsync($"proof-validation-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var orderNumber = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay);
        var token = await _factory.IssueAccessTokenAsync(buyer.Id, UserRoles.Buyer);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return (client, orderNumber);
    }

    private static MultipartFormDataContent Multipart(byte[] bytes, string contentType, string fileName)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(file, "file", fileName);
        return content;
    }

    public class Factory : IntegrationWebAppFactory
    {
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            foreach (var descriptor in services.Where(d => d.ServiceType == typeof(IFileStorageService)).ToList())
            {
                services.Remove(descriptor);
            }

            services.AddSingleton<IFileStorageService, ProofValidationStorageFake>();
        }
    }

    private sealed class ProofValidationStorageFake : IFileStorageService
    {
        public Task<StoredFile> UploadAsync(Stream content, string folder, string originalFileName, string contentType, CancellationToken ct) =>
            Task.FromResult(new StoredFile($"/uploads/{folder}/{originalFileName}", $"{folder}/{originalFileName}", contentType, content.Length));

        public Task DeleteAsync(string fileKey, CancellationToken ct) => Task.CompletedTask;

        public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream([0xFF, 0xD8, 0xFF], writable: false));
    }
}
