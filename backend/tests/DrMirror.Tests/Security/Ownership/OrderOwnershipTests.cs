using System.Net;
using System.Net.Http.Headers;
using DrMirror.Api.Domain.Identity;
using DrMirror.Tests.Infrastructure;

namespace DrMirror.Tests.Security.Ownership;

[Collection(IntegrationTestCollection.Name)]
public class OrderOwnershipTests : IClassFixture<OrderOwnershipTests.Factory>
{
    private readonly Factory _factory;

    public OrderOwnershipTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Buyer_guessing_another_buyers_order_number_receives_404_without_order_fields()
    {
        var owner = await _factory.CreateUserAsync("owner-boundary@example.com");
        var otherBuyer = await _factory.CreateUserAsync("other-boundary@example.com");
        var orderNumber = await _factory.SeedOrderAsync(owner.Id);
        var token = await _factory.IssueAccessTokenAsync(otherBuyer.Id, UserRoles.Buyer);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(orderNumber, body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("total", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("items", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("paymentProofs", body, StringComparison.OrdinalIgnoreCase);
    }

    public class Factory : IntegrationWebAppFactory;
}
