using System.Net;
using System.Net.Http.Json;
using DrMirror.Api.Features.AppConfig;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.AppConfig;

[Collection(IntegrationTestCollection.Name)]
public class AppConfigEndpointTests : IClassFixture<AppConfigEndpointTests.Factory>
{
    private readonly Factory _factory;

    public AppConfigEndpointTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task App_config_exposes_effective_payment_proof_max_file_size()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/app-config");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AppConfigResponse>();
        Assert.NotNull(body);
        Assert.Equal(3 * 1024 * 1024, body.PaymentProofUpload.MaxFileSizeBytes);
    }

    [Fact]
    public async Task App_config_exposes_support_contact_email_when_configured()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/app-config");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AppConfigResponse>();
        Assert.NotNull(body);
        Assert.Equal("ops@example.com", body.Support.ContactEmail);
    }

    public class Factory : IntegrationWebAppFactory
    {
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<FileStorageOptions>(o =>
            {
                o.MaxFileSizeBytes = 3 * 1024 * 1024;
            });
            services.Configure<SupportOptions>(o =>
            {
                o.ContactEmail = "ops@example.com";
            });
        }
    }

    private sealed record AppConfigResponse(
        PaymentProofUploadConfig PaymentProofUpload,
        SupportConfig Support);

    private sealed record PaymentProofUploadConfig(long MaxFileSizeBytes);

    private sealed record SupportConfig(string? ContactEmail);
}
