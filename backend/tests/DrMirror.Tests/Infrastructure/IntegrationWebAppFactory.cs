using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DrMirror.Tests.Infrastructure;

/// <summary>
/// Base for integration tests that need a real <see cref="WebApplicationFactory{TEntryPoint}"/>.
/// Centralizes the four env vars Program.cs needs before <c>WebApplication.CreateBuilder</c>
/// can succeed, swaps <c>AppDbContext</c> to an isolated in-memory database, and strips
/// Coravel's <c>QueuingHost</c> background service so its scheduler timer can't race with
/// test teardown.
///
/// <para>
/// Why the env vars live here and not in <see cref="ConfigureWebHost"/>: Program.cs reads
/// <c>ConnectionStrings:Default</c>, <c>Jwt:Secret</c>, <c>Jwt:Issuer</c>, and
/// <c>Jwt:Audience</c> during <c>WebApplication.CreateBuilder</c> (and <c>JwtOptions</c>'s
/// <c>ValidateOnStart</c> runs them through <c>StartupValidator</c> inside
/// <c>Host.StartAsync</c>). Both happen before any test-factory hook fires, so the values
/// have to be on the process before the first fixture constructs.
/// </para>
///
/// Pair every subclass with <c>[Collection("Integration")]</c> (see
/// <see cref="IntegrationTestCollection"/>) so xUnit serializes host bootstrap across
/// classes — otherwise two factories can fight over Program.cs's process-level statics.
/// </summary>
public abstract class IntegrationWebAppFactory : WebApplicationFactory<Program>
{
    private static bool _envVarsSet;

    static IntegrationWebAppFactory()
    {
        EnsureTestEnvVars();
    }

    /// <summary>
    /// Sets the four environment variables Program.cs needs before
    /// <c>WebApplication.CreateBuilder</c> can succeed. Safe to call multiple times.
    /// </summary>
    public static void EnsureTestEnvVars()
    {
        if (_envVarsSet) return;
        _envVarsSet = true;
        Environment.SetEnvironmentVariable(
            "ConnectionStrings__Default",
            "Server=localhost;Database=DrMirrorTest;Trusted_Connection=True;TrustServerCertificate=True;");
        Environment.SetEnvironmentVariable(
            "Jwt__Secret",
            "test-signing-secret-minimum-32-chars-long!!");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "drmirror.test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "drmirror.test");
    }

    /// <summary>Unique in-memory database name per factory instance. Override for a stable name.</summary>
    public virtual string DbName { get; } = "DrMirrorTest_" + Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            RemoveDbContextRegistrations(services);
            services.AddDbContext<AppDbContext>(ConfigureDbContext);

            RemoveBackgroundServices(services);

            ConfigureTestServices(services);
        });
    }

    /// <summary>DbContext options builder hook. Override to add interceptors, etc.</summary>
    protected virtual void ConfigureDbContext(DbContextOptionsBuilder options)
    {
        options.UseInMemoryDatabase(DbName);
    }

    /// <summary>Extra service registrations specific to a subclass (auth handlers, etc.).</summary>
    protected virtual void ConfigureTestServices(IServiceCollection services)
    {
    }

    private static void RemoveDbContextRegistrations(IServiceCollection services)
    {
        var descriptors = services
            .Where(d => d.ServiceType.Name.Contains("DbContextOptions"))
            .ToList();
        foreach (var d in descriptors)
        {
            services.Remove(d);
        }
    }

    private static void RemoveBackgroundServices(IServiceCollection services)
    {
        // Remove EmailOutboxProcessor so it doesn't poll during tests.
        var outboxProcessor = services.FirstOrDefault(
            d => d.ImplementationType == typeof(EmailOutboxProcessor));
        if (outboxProcessor is not null)
            services.Remove(outboxProcessor);

        // Also remove any lingering Coravel QueuingHost if present.
        var queuingHost = services.FirstOrDefault(
            d => d.ImplementationType?.FullName?.Contains("QueuingHost") == true);
        if (queuingHost is not null)
            services.Remove(queuingHost);
    }
}
