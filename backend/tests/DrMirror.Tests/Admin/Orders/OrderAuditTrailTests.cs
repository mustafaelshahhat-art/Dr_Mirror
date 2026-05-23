using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Admin.Orders;

[Collection(IntegrationTestCollection.Name)]
public class OrderAuditTrailTests : IClassFixture<OrderAuditTrailTests.Factory>
{
    private readonly Factory _factory;

    public OrderAuditTrailTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Proof_based_lifecycle_writes_one_audit_row_per_admin_action()
    {
        var admin = await _factory.CreateUserAsync($"audit-life-admin-{Guid.NewGuid():N}@example.com", UserRoles.Admin);
        var buyer = await _factory.CreateUserAsync($"audit-life-buyer-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var (orderNumber, proofId) = await _factory.SeedOrderWithProofAsync(buyer.Id, "payment-proofs/audit-life.jpg");
        var orderId = await _factory.GetOrderIdAsync(orderNumber);
        var client = await _factory.MakeAdminClientAsync(admin.Id);

        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{orderNumber}/proof/{proofId}/approve", new
        {
            reviewNote = "matches bank receipt",
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{orderNumber}/transition", new
        {
            toStatus = "Preparing",
            reason = "start packing",
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{orderNumber}/transition", new
        {
            toStatus = "Shipped",
            reason = (string?)null,
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{orderNumber}/transition", new
        {
            toStatus = "Delivered",
            reason = (string?)null,
        }));

        var entries = await _factory.GetOrderAuditEntriesAsync(orderId);

        Assert.Equal(4, entries.Count);
        Assert.Equal(["PaymentProof.Approve", "Order.StatusChange", "Order.StatusChange", "Order.StatusChange"], entries.Select(e => e.ActionType).ToArray());
        Assert.Equal(("Pending", "Approved"), (entries[0].PreviousStatus, entries[0].NewStatus));
        Assert.Equal(("Paid", "Preparing"), (entries[1].PreviousStatus, entries[1].NewStatus));
        Assert.Equal(("Preparing", "Shipped"), (entries[2].PreviousStatus, entries[2].NewStatus));
        Assert.Equal(("Shipped", "Delivered"), (entries[3].PreviousStatus, entries[3].NewStatus));
        Assert.Equal("matches bank receipt", entries[0].Note);
        Assert.Equal("start packing", entries[1].Note);
        Assert.All(entries, entry => Assert.True(entry.TimestampUtc > DateTimeOffset.MinValue));
    }

    [Fact]
    public async Task Payment_review_notes_are_persisted_on_audit_rows()
    {
        var admin = await _factory.CreateUserAsync($"audit-note-admin-{Guid.NewGuid():N}@example.com", UserRoles.Admin);
        var buyer = await _factory.CreateUserAsync($"audit-note-buyer-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var approved = await _factory.SeedOrderWithProofAsync(buyer.Id, "payment-proofs/audit-approve.jpg");
        var rejected = await _factory.SeedOrderWithProofAsync(buyer.Id, "payment-proofs/audit-reject.jpg");
        var approvedOrderId = await _factory.GetOrderIdAsync(approved.OrderNumber);
        var rejectedOrderId = await _factory.GetOrderIdAsync(rejected.OrderNumber);
        var client = await _factory.MakeAdminClientAsync(admin.Id);

        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{approved.OrderNumber}/proof/{approved.ProofId}/approve", new
        {
            reviewNote = "matches bank receipt",
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{approved.OrderNumber}/transition", new
        {
            toStatus = "Preparing",
            reason = (string?)null,
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{rejected.OrderNumber}/proof/{rejected.ProofId}/reject", new
        {
            reviewNote = "image illegible",
        }));

        var approveEntries = await _factory.GetOrderAuditEntriesAsync(approvedOrderId);
        var rejectEntries = await _factory.GetOrderAuditEntriesAsync(rejectedOrderId);

        Assert.Contains(approveEntries, e => e.ActionType == "PaymentProof.Approve" && e.Note == "matches bank receipt");
        Assert.Contains(rejectEntries, e => e.ActionType == "PaymentProof.Reject" && e.Note == "image illegible");
    }

    private static async Task AssertOkAsync(Task<HttpResponseMessage> request)
    {
        var response = await request;
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    public class Factory : IntegrationWebAppFactory
    {
        public async Task<HttpClient> MakeAdminClientAsync(Guid adminId)
        {
            var token = await this.IssueAccessTokenAsync(adminId, UserRoles.Admin);
            var client = CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        public async Task<Guid> GetOrderIdAsync(string orderNumber)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await db.Orders
                .Where(o => o.OrderNumber == orderNumber)
                .Select(o => o.Id)
                .SingleAsync();
        }

        public async Task<List<AdminAuditLogEntry>> GetOrderAuditEntriesAsync(Guid orderId)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await db.AdminAuditLogEntries
                .Where(e => e.TargetEntityType == "Order" && e.TargetEntityId == orderId.ToString())
                .OrderBy(e => e.TimestampUtc)
                .ThenBy(e => e.Id)
                .ToListAsync();
        }
    }
}
