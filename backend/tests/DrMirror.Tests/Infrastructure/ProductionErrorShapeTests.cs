using System.Net;
using DrMirror.Tests.Infrastructure;

namespace DrMirror.Tests.Infrastructure;

[Collection(IntegrationTestCollection.Name)]
public class ProductionErrorShapeTests
{
    [Fact]
    public async Task Error_response_contains_no_stack_trace_or_exception()
    {
        using var factory = new ProductionErrorFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync("/api/nonexistent");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("stackTrace", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("exception", body, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class ProductionErrorFactory : IntegrationWebAppFactory
    {
        public override string DbName => "DrMirror_ProdErrorTest";
    }
}
