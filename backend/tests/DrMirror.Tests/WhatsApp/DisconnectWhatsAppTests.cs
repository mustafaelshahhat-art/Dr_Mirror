using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.WhatsApp;

[Collection(IntegrationTestCollection.Name)]
public sealed class DisconnectWhatsAppTests : IClassFixture<DisconnectWhatsAppTests.Factory>
{
    private readonly Factory _factory;

    public DisconnectWhatsAppTests(Factory factory) => _factory = factory;

    [Fact]
    public async Task Disconnect_rejects_non_admin_callers()
    {
        var buyer = await _factory.CreateUserAsync($"buyer-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var token = await _factory.IssueAccessTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PostAsync("/api/admin/whatsapp/disconnect", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Disconnect_writes_audit_and_preserves_outbox_history()
    {
        _factory.Handler.NextStatusCode = HttpStatusCode.NoContent;
        var client = await CreateAdminClientAsync();
        var messageId = await SeedMessageAsync(WhatsAppOutboxStatus.Failed);

        var response = await client.PostAsync("/api/admin/whatsapp/disconnect", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("/api/logout", _factory.Handler.LastPath);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var message = await db.WhatsAppOutboxMessages.FindAsync(messageId);

        Assert.NotNull(message);
        Assert.Equal(WhatsAppOutboxStatus.Failed, message!.Status);
        Assert.Single(db.WhatsAppOutboxMessages);
        Assert.Contains(db.AdminAuditLogEntries, a => a.ActionType == "WhatsApp.Disconnect" && a.TargetEntityType == "WhatsAppSession");
    }

    [Fact]
    public async Task Disconnect_returns_bad_gateway_when_sidecar_fails()
    {
        _factory.Handler.NextStatusCode = HttpStatusCode.InternalServerError;
        var client = await CreateAdminClientAsync();

        var response = await client.PostAsync("/api/admin/whatsapp/disconnect", null);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    private async Task<HttpClient> CreateAdminClientAsync()
    {
        var admin = await _factory.CreateUserAsync($"admin-{Guid.NewGuid():N}@example.com", UserRoles.Admin);
        var token = await _factory.IssueAccessTokenAsync(admin.Id, UserRoles.Admin);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<Guid> SeedMessageAsync(WhatsAppOutboxStatus status)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.WhatsAppOutboxMessages.RemoveRange(db.WhatsAppOutboxMessages);
        await db.SaveChangesAsync();

        var id = Guid.NewGuid();
        db.WhatsAppOutboxMessages.Add(new WhatsAppOutboxMessage
        {
            Id = id,
            EventType = "OrderConfirmation",
            Payload = "{}",
            RecipientPhoneMasked = "+20*******1234",
            Status = status,
            IdempotencyKey = $"test:{id}",
            CreatedAt = DateTimeOffset.UtcNow,
            NextRetryAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
        return id;
    }

    public sealed class Factory : IntegrationWebAppFactory
    {
        public FakeSidecarHandler Handler { get; } = new();

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            foreach (var descriptor in services.Where(d => d.ServiceType == typeof(WhatsAppServiceClient) || d.ServiceType == typeof(IWhatsAppSender)).ToList())
            {
                services.Remove(descriptor);
            }

            services.AddScoped(_ => new WhatsAppServiceClient(
                new HttpClient(Handler) { BaseAddress = new Uri("https://whatsapp.test") },
                Options.Create(new WhatsAppOptions
                {
                    Enabled = true,
                    ServiceUrl = "https://whatsapp.test",
                    InternalApiKey = "test-key",
                })));
            services.AddScoped<IWhatsAppSender>(sp => sp.GetRequiredService<WhatsAppServiceClient>());
        }
    }

    public sealed class FakeSidecarHandler : HttpMessageHandler
    {
        public HttpStatusCode NextStatusCode { get; set; } = HttpStatusCode.NoContent;
        public string? LastPath { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastPath = request.RequestUri?.AbsolutePath;
            return Task.FromResult(new HttpResponseMessage(NextStatusCode));
        }
    }
}
