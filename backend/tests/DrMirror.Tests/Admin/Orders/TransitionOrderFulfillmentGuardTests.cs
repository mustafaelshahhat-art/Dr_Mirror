using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Admin.Orders;

[Collection(IntegrationTestCollection.Name)]
public class TransitionOrderFulfillmentGuardTests : IClassFixture<TransitionOrderFulfillmentGuardTests.Factory>
{
    private readonly Factory _factory;

    public TransitionOrderFulfillmentGuardTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Proof_based_pending_order_cannot_transition_directly_to_preparing()
    {
        var admin = await _factory.CreateUserAsync($"guard-admin-{Guid.NewGuid():N}@example.com", UserRoles.Admin);
        var buyer = await _factory.CreateUserAsync($"guard-buyer-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var orderNumber = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay, OrderStatus.Pending);
        var token = await _factory.IssueAccessTokenAsync(admin.Id, UserRoles.Admin);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PostAsJsonAsync($"/api/admin/orders/{orderNumber}/transition", new
        {
            toStatus = "Preparing",
            reason = "force fulfillment",
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Fulfillment requires Paid payment", body, StringComparison.OrdinalIgnoreCase);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var savedStatus = await db.Orders
            .Where(o => o.OrderNumber == orderNumber)
            .Select(o => o.Status)
            .SingleAsync();
        Assert.Equal(OrderStatus.Pending, savedStatus);
    }

    public class Factory : IntegrationWebAppFactory { }
}
