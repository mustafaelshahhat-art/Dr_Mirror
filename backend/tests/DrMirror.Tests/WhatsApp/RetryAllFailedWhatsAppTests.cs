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
public sealed class RetryAllFailedWhatsAppTests : IClassFixture<RetryAllFailedWhatsAppTests.Factory>
{
    private readonly Factory _factory;

    public RetryAllFailedWhatsAppTests(Factory factory) => _factory = factory;

    [Fact]
    public async Task Retry_all_failed_queues_children_for_failed_records_only()
    {
        var client = await CreateAdminClientAsync();
        var failed1 = await SeedMessageAsync(WhatsAppOutboxStatus.Failed);
        var failed2 = await SeedMessageAsync(WhatsAppOutboxStatus.Failed);
        var sent = await SeedMessageAsync(WhatsAppOutboxStatus.Sent);

        var response = await client.PostAsync("/api/admin/whatsapp/attempts/retry-all-failed", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<RetryAllResponse>();
        Assert.NotNull(body);
        Assert.Equal(2, body!.Queued);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var all = db.WhatsAppOutboxMessages.ToList();

        Assert.Equal(WhatsAppOutboxStatus.Retrying, all.Single(m => m.Id == failed1).Status);
        Assert.Equal(WhatsAppOutboxStatus.Retrying, all.Single(m => m.Id == failed2).Status);
        Assert.Equal(WhatsAppOutboxStatus.Sent, all.Single(m => m.Id == sent).Status);
        Assert.Equal(2, all.Count(m => m.ParentMessageId == failed1 || m.ParentMessageId == failed2));
        Assert.All(all.Where(m => m.ParentMessageId is not null), child =>
        {
            Assert.Equal(WhatsAppOutboxStatus.Pending, child.Status);
            var parent = all.Single(m => m.Id == child.ParentMessageId);
            Assert.StartsWith(parent.IdempotencyKey + ":retry:", child.IdempotencyKey);
            var suffix = child.IdempotencyKey[(parent.IdempotencyKey.Length + ":retry:".Length)..];
            Assert.Equal(32, suffix.Length);
            Assert.True(suffix.All(c => "0123456789abcdef".Contains(c)), "Retry key suffix must be a 32-char hex string");
        });
        Assert.Contains(db.AdminAuditLogEntries, a => a.ActionType == "WhatsApp.RetryAll" && a.Note == "Queued 2 messages");
    }

    [Fact]
    public async Task Retry_all_failed_rejects_non_admin_callers()
    {
        var buyer = await _factory.CreateUserAsync($"buyer-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var token = await _factory.IssueAccessTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PostAsync("/api/admin/whatsapp/attempts/retry-all-failed", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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

    private sealed record RetryAllResponse(int Queued);

    public sealed class Factory : IntegrationWebAppFactory;
}
