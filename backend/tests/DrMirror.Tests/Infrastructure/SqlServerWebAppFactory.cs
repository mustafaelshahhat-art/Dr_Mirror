using System.Data.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DrMirror.Tests.Infrastructure;

/// <summary>
/// SQL Server-backed integration test factory. Only activates when the
/// <c>DRMIRROR_TEST_SQL_CONNECTION</c> environment variable is set to a
/// valid SQL Server connection string. When absent, tests using this
/// factory are silently skipped.
/// </summary>
public abstract class SqlServerWebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private static readonly string? ConnectionString =
        Environment.GetEnvironmentVariable("DRMIRROR_TEST_SQL_CONNECTION");

    private readonly string _dbName = "DrMirrorTest_Sql_" + Guid.NewGuid().ToString("N")[..8];

    public static bool IsAvailable => !string.IsNullOrWhiteSpace(ConnectionString);

    public async Task InitializeAsync()
    {
        if (!IsAvailable) return;

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public new async Task DisposeAsync()
    {
        if (IsAvailable)
        {
            try
            {
                using var scope = Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.Database.EnsureDeletedAsync();
            }
            catch
            {
            }
        }

        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        IntegrationWebAppFactory.EnsureTestEnvVars();

        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            var descriptors = services
                .Where(d => d.ServiceType.Name.Contains("DbContextOptions"))
                .ToList();
            foreach (var d in descriptors) services.Remove(d);

            var cs = ModifyDatabaseName(ConnectionString!, _dbName);

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlServer(cs);
            });

            var outboxProcessor = services.FirstOrDefault(
                d => d.ImplementationType == typeof(EmailOutboxProcessor));
            if (outboxProcessor is not null) services.Remove(outboxProcessor);

            var queuingHost = services.FirstOrDefault(
                d => d.ImplementationType?.FullName?.Contains("QueuingHost") == true);
            if (queuingHost is not null) services.Remove(queuingHost);
        });
    }

    private static string ModifyDatabaseName(string original, string newDbName)
    {
        var builder = new DbConnectionStringBuilder
        {
            ConnectionString = original,
        };
        builder["Database"] = newDbName;
        return builder.ConnectionString;
    }
}
