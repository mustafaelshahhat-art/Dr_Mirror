using System.Text.Json;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using DrMirror.Api.BackgroundServices;
using DrMirror.Api.Features.Addresses;
using DrMirror.Api.Features.Admin;
using DrMirror.Api.Features.AppConfig;
using DrMirror.Api.Features.Auth;
using DrMirror.Api.Features.Auth.Refresh;
using DrMirror.Api.Features.Checkout.CreateOrder;
using DrMirror.Api.Features.Cart;
using DrMirror.Api.Features.Catalog;
using DrMirror.Api.Features.Checkout;
using DrMirror.Api.Features.Inquiries;
using DrMirror.Api.Features.Notifications;
using DrMirror.Api.Features.Orders;
using DrMirror.Api.Features.Shipping;
using DrMirror.Api.Infrastructure.Extensions;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared.HealthChecks;
using DrMirror.Api.Shared.Http;
using DrMirror.Api.Shared.Logging;
using DrMirror.Api.Shared.Startup;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;
using Serilog.Events;

// ---------------------------------------------------------------------------
// Bootstrap logger — captures startup errors before Host Serilog kicks in.
// ---------------------------------------------------------------------------
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

// CI pre-deploy gate (FR-024): validate required production secrets and exit
// without touching the database or starting the host. Invoked from
// `backend/scripts/verify-prod-secrets.ps1`.
if (args.Contains("--validate-prod-secrets"))
{
    try
    {
        var earlyConfig = new ConfigurationBuilder().AddEnvironmentVariables().Build();
        ProdSecretsValidator.Validate(earlyConfig);
        Console.WriteLine("ProdSecretsValidator: all required secrets present.");
        Log.CloseAndFlush();
        return;
    }
    catch (ProdSecretsValidationException ex)
    {
        Console.Error.WriteLine(ex.Message);
        Log.CloseAndFlush();
        Environment.Exit(1);
        return;
    }
}

try
{
    var builder = WebApplication.CreateBuilder(args);

    // -----------------------------------------------------------------------
    // Serilog — Async rolling File sink (50 MB cap, 30-day retention).
    // Console in Development only. CorrelationId enricher.
    // -----------------------------------------------------------------------
    builder.Host.UseSerilog((context, services, configuration) =>
    {
        configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Filter.With(new SecretLogEventFilter())
            .Enrich.FromLogContext()
            .Enrich.WithCorrelationId()
            .Destructure.ByTransforming<HttpRequest>(request => new
            {
                request.Method,
                Path = request.Path.Value,
                Headers = request.Headers
                    .Where(h => !string.Equals(h.Key, "Authorization", StringComparison.OrdinalIgnoreCase)
                        && !string.Equals(h.Key, "Cookie", StringComparison.OrdinalIgnoreCase)
                        && !string.Equals(h.Key, "X-Idempotency-Key", StringComparison.OrdinalIgnoreCase))
                    .ToDictionary(h => h.Key, h => h.Value.ToString())
            })
            .WriteTo.Async(a => a.File(
                path: "logs/drmirror-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                fileSizeLimitBytes: 50 * 1024 * 1024,
                rollOnFileSizeLimit: true,
                outputTemplate:
                    "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] " +
                    "[{CorrelationId}] {Message:lj}{NewLine}{Exception}"));

        if (context.HostingEnvironment.IsDevelopment())
        {
            configuration.WriteTo.Console(
                outputTemplate:
                    "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}");
        }
    }, preserveStaticLogger: true);

    // -----------------------------------------------------------------------
    // EF Core — SQL Server, scoped lifetime (the default for AddDbContext).
    // The connection string lives in ConnectionStrings:Default; never in code.
    // -----------------------------------------------------------------------
    var connectionString = builder.Configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException(
            "ConnectionStrings:Default is required. " +
            "Set it via appsettings.Development.json, user-secrets, or ConnectionStrings__Default env var.");

    builder.Services.AddDbContext<AppDbContext>(opt =>
    {
        opt.UseSqlServer(connectionString, sql =>
        {
            sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
            sql.EnableRetryOnFailure(maxRetryCount: 3);
        });

        if (builder.Environment.IsDevelopment())
        {
            opt.EnableSensitiveDataLogging();
            opt.EnableDetailedErrors();
        }
    });

    // -----------------------------------------------------------------------
    // ASP.NET Identity — Core only (no cookie auth scheme). We deliberately
    // avoid AddIdentity<,> because it registers a cookie authentication scheme
    // as the default, which would redirect unauthenticated API requests to a
    // non-existent /Account/Login page. JWT Bearer is the sole auth scheme.
    // No email confirmation in M1 per the locked decision (immediate signup).
    // -----------------------------------------------------------------------
    builder.Services.AddIdentityServices();

    // -----------------------------------------------------------------------
    // JWT options + auth scheme. Validate the bound options at startup so a
    // missing secret crashes us early instead of producing unsigned tokens.
    // -----------------------------------------------------------------------
    builder.Services.AddJwtAuthentication(builder.Configuration);

    // -----------------------------------------------------------------------
    // Application services — auth helpers, seeding, cart, order machinery.
    // -----------------------------------------------------------------------
    builder.Services.AddApplicationServices();

    // -----------------------------------------------------------------------
    // File storage — env-switched between local filesystem and Cloudinary.
    // -----------------------------------------------------------------------
    builder.Services.AddStorageServices(builder.Configuration);

    // -----------------------------------------------------------------------
    // Email — dev defaults to log-only; mailkit kicks in when SMTP is configured.
    // Includes durable outbox processor.
    // -----------------------------------------------------------------------
    builder.Services.AddEmailServices(builder.Configuration);

    // WhatsApp — Baileys sidecar + durable outbox. Sidecar startup is non-fatal.
    builder.Services.AddWhatsAppServices(builder.Configuration);

    // FluentValidation — discover validators in this assembly.
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // -----------------------------------------------------------------------
    // CORS — allowlist from configuration.
    // -----------------------------------------------------------------------
    const string CorsPolicy = "DrMirrorWebClients";
    builder.Services.AddCors(options =>
    {
        var allowed = builder.Configuration
            .GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

        options.AddPolicy(CorsPolicy, policy =>
        {
            policy
                .WithOrigins(allowed)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    // Public-runtime config exposed via /api/app-config. Optional section —
    // missing/blank ContactEmail simply hides the SPA contact affordance.
    builder.Services.Configure<DrMirror.Api.Features.AppConfig.SupportOptions>(
        builder.Configuration.GetSection("Support"));

    // ProblemDetails — RFC 7807 contract for every error response.
    builder.Services.AddProblemDetails(options =>
    {
        options.CustomizeProblemDetails = ctx =>
        {
            ctx.ProblemDetails.Extensions.TryAdd("traceId", ctx.HttpContext.TraceIdentifier);
        };
    });

    // Convert Minimal-API binding failures (e.g. an enum query parameter with
    // a value outside the enum) into 400 ProblemDetails instead of unhandled 500.
    builder.Services.AddExceptionHandler<DrMirror.Api.Shared.ExceptionHandling.BadHttpRequestExceptionHandler>();

    builder.Services.AddRouting();

    // -----------------------------------------------------------------------
    // Security headers — middleware attaches the baseline header set to every
    // response via Response.OnStarting so it survives Results.Stream(...) too.
    // -----------------------------------------------------------------------
    builder.Services
        .AddOptions<SecurityHeadersOptions>()
        .Bind(builder.Configuration.GetSection("Security:Headers"));

    // -----------------------------------------------------------------------
    // JSON serializer — use UnsafeRelaxedJsonEscaping so Arabic (and other
    // non-ASCII) characters are written as native UTF-8 in responses instead
    // of being escaped as \uXXXX sequences. The payload is still valid UTF-8
    // JSON; clients receive readable Arabic text without any decoder step.
    // -----------------------------------------------------------------------
    builder.Services.ConfigureHttpJsonOptions(opts =>
    {
        opts.SerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
        opts.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        // The specific snake-case converter must precede the global enum
        // converter — System.Text.Json picks the first matching converter
        // from JsonSerializerOptions.Converters, ahead of any [JsonConverter]
        // attribute on the type.
        opts.SerializerOptions.Converters.Add(new AddressSaveOutcomeJsonConverter());
        opts.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

    // -----------------------------------------------------------------------
    // Rate limiting — IP-keyed sliding/fixed windows on sensitive endpoints.
    // -----------------------------------------------------------------------
    builder.Services.AddRateLimitingPolicies(builder.Configuration);

    builder.Services.AddHealthChecks()
        .AddCheck<SqlServerHealthCheck>("sqlserver")
        .AddCheck<FileStorageHealthCheck>("filestorage")
        .AddCheck<OutboxHealthCheck>("outbox");

    var proofPurgeEnabled = builder.Configuration.GetValue<bool?>("Retention:EnableProofPurge")
        ?? builder.Environment.IsProduction();
    if (proofPurgeEnabled)
    {
        builder.Services.AddHostedService<PaymentProofRetentionPurgeService>();
    }

    var outboxPurgeEnabled = builder.Configuration.GetValue<bool?>("Retention:EnableOutboxPurge")
        ?? builder.Environment.IsProduction();
    if (outboxPurgeEnabled)
    {
        builder.Services.AddHostedService<EmailOutboxRetentionService>();
    }

    var app = builder.Build();

    // Production safety: every required secret must be configured. Delegates
    // to ProdSecretsValidator so the same logic is shared with the CI
    // pre-deploy gate (backend/scripts/verify-prod-secrets.ps1), eliminating
    // CI/runtime drift.
    if (app.Environment.IsProduction())
    {
        ProdSecretsValidator.Validate(app.Configuration);
    }

    // -----------------------------------------------------------------------
    // Apply migrations (Dev only) and run idempotent seeding.
    // -----------------------------------------------------------------------
    using (var scope = app.Services.CreateScope())
    {
        var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
        await seeder.SeedAsync();
    }

    app.UseSerilogRequestLogging(options =>
    {
        options.GetLevel = (httpContext, _elapsed, ex) =>
        {
            if (ex is not null || httpContext.Response.StatusCode >= 500)
                return LogEventLevel.Error;
            if (httpContext.Response.StatusCode >= 400)
                return LogEventLevel.Warning;
            return LogEventLevel.Information;
        };
    });

    app.UseExceptionHandler();
    app.UseStatusCodePages();

    // Security headers — registered before CORS/static/auth so the
    // OnStarting callback runs for every response shape (JSON, stream, 401, 404, 429).
    app.UseMiddleware<SecurityHeadersMiddleware>();

    app.UseCors(CorsPolicy);

    // Static files for the local upload provider — serves product images
    // under /uploads/* directly from wwwroot/uploads. The Cloudinary provider
    // doesn't need this middleware (it serves from its own CDN).
    // Payment-proof files are blocked here and served only via the authenticated
    // /api/orders/{orderNumber}/proof/{proofId}/file endpoint.
    var webRoot = app.Environment.WebRootPath ??
                  Path.Combine(app.Environment.ContentRootPath, "wwwroot");
    Directory.CreateDirectory(Path.Combine(webRoot, "uploads"));
    app.Use(async (ctx, next) =>
    {
        if (ctx.Request.Path.StartsWithSegments("/uploads/payment-proofs"))
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }
        await next(ctx);
    });
    app.UseStaticFiles();

    app.UseAuthentication();
    // Reject forged refresh requests (missing/unknown Origin) before the
    // rate-limiter so a forgery cannot consume a budget slot.
    app.UseMiddleware<RequireTrustedOriginMiddleware>();
    app.UseRateLimiter();
    app.UseAuthorization();
    app.Use(async (ctx, next) =>
    {
        if (HttpMethods.IsGet(ctx.Request.Method))
        {
            ctx.Response.OnStarting(() =>
            {
                var path = ctx.Request.Path;
                if (path.StartsWithSegments("/api/catalog"))
                {
                    ctx.Response.Headers.CacheControl = "public, max-age=60, stale-while-revalidate=300";
                    ctx.Response.Headers.Vary = "Accept-Language";
                }
                else if (path.StartsWithSegments("/api/orders")
                    || path.StartsWithSegments("/api/cart")
                    || path.StartsWithSegments("/api/addresses")
                    || path.StartsWithSegments("/api/auth")
                    || path.StartsWithSegments("/api/admin")
                    || path.StartsWithSegments("/api/health"))
                {
                    ctx.Response.Headers.CacheControl = "private, no-store";
                }

                return Task.CompletedTask;
            });
        }

        await next();
    });

    // -----------------------------------------------------------------------
    // Endpoints.
    // -----------------------------------------------------------------------
    app.MapGet("/api/health/live", () => Results.Json(new { status = "Healthy" }))
        .WithName("HealthLive")
        .WithTags("Diagnostics");

    var readyOptions = new HealthCheckOptions
    {
        ResponseWriter = async (context, report) =>
        {
            context.Response.ContentType = "application/json";
            context.Response.Headers.CacheControl = "no-store";
            var response = new
            {
                status = report.Status.ToString(),
                checks = report.Entries.Select(e => new
                {
                    name = e.Key,
                    status = e.Value.Status.ToString(),
                    duration = e.Value.Duration.ToString(),
                    description = e.Value.Description,
                }),
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        },
        ResultStatusCodes =
        {
            [HealthStatus.Healthy] = StatusCodes.Status200OK,
            [HealthStatus.Degraded] = StatusCodes.Status200OK,
            [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
        },
    };

    app.MapHealthChecks("/api/health/ready", readyOptions)
        .WithName("HealthReady")
        .WithTags("Diagnostics");
    app.MapHealthChecks("/api/health", readyOptions)
        .WithName("Health")
        .WithTags("Diagnostics");

    app.MapAppConfigEndpoints();
    app.MapAuthEndpoints();
    app.MapCatalogEndpoints();
    app.MapCartEndpoints();
    app.MapCheckoutEndpoints();
    app.MapShippingEndpoints();
    app.MapOrderEndpoints();
    app.MapAddressEndpoints();
    app.MapInquiryEndpoints();
    app.MapNotificationEndpoints();
    app.MapAdminEndpoints();

    Log.Information("Dr_Mirror API starting up — env={Env}", app.Environment.EnvironmentName);
    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Dr_Mirror API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Expose Program class for WebApplicationFactory in integration tests.
public partial class Program { }
