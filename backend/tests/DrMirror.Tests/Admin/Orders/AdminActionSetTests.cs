using System.Net.Http.Headers;
using System.Text.Json;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;

namespace DrMirror.Tests.Admin.Orders;

[Collection(IntegrationTestCollection.Name)]
public class AdminActionSetTests : IClassFixture<AdminActionSetTests.Factory>
{
    private readonly Factory _factory;

    public AdminActionSetTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Admin_order_detail_returns_explicit_visible_action_sets()
    {
        var admin = await _factory.CreateUserAsync($"actions-admin-{Guid.NewGuid():N}@example.com", UserRoles.Admin);
        var buyer = await _factory.CreateUserAsync($"actions-buyer-{Guid.NewGuid():N}@example.com", UserRoles.Buyer);
        var token = await _factory.IssueAccessTokenAsync(admin.Id, UserRoles.Admin);

        var codConfirmed = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Cod, OrderStatus.Confirmed);
        var proofPending = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay, OrderStatus.Pending);
        var proofReview = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay, OrderStatus.PendingPaymentReview);
        var preparing = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Cod, OrderStatus.Preparing);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        Assert.Equal(["Preparing", "Cancelled"], await ReadAllowedNextStatesAsync(client, codConfirmed));

        var proofPendingActions = await ReadAllowedNextStatesAsync(client, proofPending);
        Assert.DoesNotContain("Preparing", proofPendingActions);
        Assert.DoesNotContain("Shipped", proofPendingActions);
        Assert.DoesNotContain("Delivered", proofPendingActions);

        Assert.Equal(["Paid", "Pending"], await ReadAllowedNextStatesAsync(client, proofReview));
        Assert.Equal(["Shipped"], await ReadAllowedNextStatesAsync(client, preparing));
    }

    private static async Task<string[]> ReadAllowedNextStatesAsync(HttpClient client, string orderNumber)
    {
        var response = await client.GetAsync($"/api/admin/orders/{orderNumber}");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement
            .GetProperty("allowedNextStatesForAdmin")
            .EnumerateArray()
            .Select(e => e.GetString() ?? string.Empty)
            .ToArray();
    }

    public class Factory : IntegrationWebAppFactory { }
}
