using System.Net;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DrMirror.Tests.Infrastructure;

[Collection(IntegrationTestCollection.Name)]
public class ProductionErrorShapeTests
{
    [Fact]
    public async Task Error_response_contains_no_stack_trace_or_exception()
    {
        using var factory = new ProductionFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync("/api/nonexistent");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("stackTrace", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("exception", body, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class ProductionFactory : WebApplicationFactory<Program>
    {
        private static bool _productionEnvVarsSet;

        static ProductionFactory()
        {
            if (_productionEnvVarsSet) return;
            _productionEnvVarsSet = true;

            Environment.SetEnvironmentVariable(
                "ConnectionStrings__Default",
                "Server=localhost;Database=DrMirrorProdTest;Trusted_Connection=True;TrustServerCertificate=True;");
            Environment.SetEnvironmentVariable(
                "Jwt__Secret",
                "prod-test-secret-key-that-is-definitely-longer-than-sixty-four-characters!!");
            Environment.SetEnvironmentVariable("Jwt__Issuer", "drmirror.test");
            Environment.SetEnvironmentVariable("Jwt__Audience", "drmirror.test");
            Environment.SetEnvironmentVariable(
                "Cors__AllowedOrigins__0",
                "https://localhost:5173");
            Environment.SetEnvironmentVariable(
                "Admin__SeedPassword",
                "ProdTestAdminPass123!");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");

            builder.ConfigureServices(services =>
            {
                var dbContextOptions = services
                    .Where(d => d.ServiceType.Name.Contains("DbContextOptions"))
                    .ToList();
                foreach (var d in dbContextOptions)
                    services.Remove(d);

                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase("DrMirror_ProdErrorTest");
                });

                var outboxProcessor = services.FirstOrDefault(
                    d => d.ImplementationType?.Name == "EmailOutboxProcessor");
                if (outboxProcessor is not null)
                    services.Remove(outboxProcessor);
            });
        }
    }
}
