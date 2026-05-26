using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.WhatsApp;

[Collection(IntegrationTestCollection.Name)]
public sealed class RetryWhatsAppAttemptTests : IClassFixture<RetryWhatsAppAttemptTests.Factory>
{
    private readonly Factory _factory;

    public RetryWhatsAppAttemptTests(Factory factory) => _factory = factory;

    [Fact]
    public async Task Retry_failed_message_creates_pending_child_and_marks_original_retrying()
    {
        var client = await CreateAdminClientAsync();
        var originalId = await SeedMessageAsync(WhatsAppOutboxStatus.Failed);

        var response = await client.PostAsync($"/api/admin/whatsapp/attempts/{originalId}/retry", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<RetryResponse>();
        Assert.NotNull(body);
        Assert.Equal(originalId, body!.OriginalId);
        Assert.NotEqual(Guid.Empty, body.RetryId);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var original = await db.WhatsAppOutboxMessages.FindAsync(originalId);
        var child = await db.WhatsAppOutboxMessages.FindAsync(body.RetryId);

        Assert.Equal(WhatsAppOutboxStatus.Retrying, original!.Status);
        Assert.NotNull(child);
        Assert.Equal(originalId, child!.ParentMessageId);
        Assert.Equal(WhatsAppOutboxStatus.Pending, child.Status);
        Assert.Equal("Order", child.EntityType);
        Assert.Equal(original.EntityId, child.EntityId);
        Assert.Contains(db.AdminAuditLogEntries, a => a.ActionType == "WhatsApp.Retry" && a.TargetEntityId == originalId.ToString());
    }

    [Theory]
    [InlineData(WhatsAppOutboxStatus.Retrying)]
    [InlineData(WhatsAppOutboxStatus.Sent)]
    [InlineData(WhatsAppOutboxStatus.Skipped)]
    public async Task Retry_non_failed_message_returns_not_retryable(WhatsAppOutboxStatus status)
    {
        var client = await CreateAdminClientAsync();
        var originalId = await SeedMessageAsync(status);

        var response = await client.PostAsync($"/api/admin/whatsapp/attempts/{originalId}/retry", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("NotRetryable", body!["code"]);
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
            EntityType = "Order",
            EntityId = Guid.NewGuid(),
        });
        await db.SaveChangesAsync();
        return id;
    }

    private sealed record RetryResponse(Guid OriginalId, Guid RetryId);

    public sealed class Factory : IntegrationWebAppFactory;
}
