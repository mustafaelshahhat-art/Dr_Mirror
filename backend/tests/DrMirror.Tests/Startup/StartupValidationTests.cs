using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace DrMirror.Tests.Startup;

[Collection(IntegrationTestCollection.Name)]
public class StartupValidationTests
{
    [Fact]
    public void Missing_ConnectionString_throws_InvalidOperationException()
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Production");
                builder.ConfigureAppConfiguration((_, configBuilder) =>
                {
                    configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:Default"] = null,
                        ["Jwt:Secret"] = "prod-test-secret-key-that-is-definitely-longer-than-sixty-four-characters!!",
                        ["Jwt:Issuer"] = "drmirror.test",
                        ["Jwt:Audience"] = "drmirror.test",
                    });
                });
            });

        Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
    }

    [Fact]
    public void Missing_JwtSecret_throws_InvalidOperationException()
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Production");
                builder.ConfigureAppConfiguration((_, configBuilder) =>
                {
                    configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:Default"] = "Server=localhost;Database=DrMirrorTest;Trusted_Connection=True;TrustServerCertificate=True;",
                        ["Jwt:Secret"] = null,
                        ["Jwt:Issuer"] = "drmirror.test",
                        ["Jwt:Audience"] = "drmirror.test",
                    });
                });
            });

        Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
    }

    [Fact]
    public void Missing_CorsAllowedOrigins_throws_InvalidOperationException()
    {
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Production");
                builder.ConfigureAppConfiguration((_, configBuilder) =>
                {
                    configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:Default"] = "Server=localhost;Database=DrMirrorTest;Trusted_Connection=True;TrustServerCertificate=True;",
                        ["Jwt:Secret"] = "prod-test-secret-key-that-is-definitely-longer-than-sixty-four-characters!!",
                        ["Jwt:Issuer"] = "drmirror.test",
                        ["Jwt:Audience"] = "drmirror.test",
                    });
                });
            });

        Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
    }
}
