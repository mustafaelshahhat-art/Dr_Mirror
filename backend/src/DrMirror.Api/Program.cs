using System.Text;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Auth;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Features.Admin;
using DrMirror.Api.Features.Cart;
using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Features.Catalog;
using DrMirror.Api.Features.Checkout;
using DrMirror.Api.Features.Orders;
using DrMirror.Api.Features.Orders.Common;
using Coravel;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Persistence.Seed;
using DrMirror.Api.Infrastructure.Storage;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;

// ---------------------------------------------------------------------------
// Bootstrap logger — captures startup errors before Host Serilog kicks in.
// ---------------------------------------------------------------------------
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

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
            .Enrich.FromLogContext()
            .Enrich.WithCorrelationId()
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
    });

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
    builder.Services
        .AddIdentityCore<User>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = false; // mirror frontend zod
            options.Password.RequiredLength = 8;
            options.Password.RequiredUniqueChars = 1;

            options.User.RequireUniqueEmail = true;

            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;

            options.SignIn.RequireConfirmedEmail = false;
            options.SignIn.RequireConfirmedAccount = false;
        })
        .AddRoles<IdentityRole<Guid>>()
        .AddSignInManager()
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders();

    // -----------------------------------------------------------------------
    // JWT options + auth scheme. Validate the bound options at startup so a
    // missing secret crashes us early instead of producing unsigned tokens.
    // -----------------------------------------------------------------------
    builder.Services.AddOptions<JwtOptions>()
        .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
        .ValidateDataAnnotations()
        .ValidateOnStart();

    // Convenience: inject JwtOptions directly without IOptions<>.
    builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<JwtOptions>>().Value);

    var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
    var jwtSecret = jwtSection["Secret"]
        ?? throw new InvalidOperationException(
            "Jwt:Secret is required. " +
            "In dev: dotnet user-secrets set \"Jwt:Secret\" \"<base64-or-long-random>\".");
    var jwtIssuer = jwtSection["Issuer"] ?? "drmirror.local";
    var jwtAudience = jwtSection["Audience"] ?? "drmirror.local";

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ClockSkew = TimeSpan.FromSeconds(30),
            };
            options.MapInboundClaims = false; // don't auto-rename JWT claims
        });

    builder.Services.AddAuthorization();

    // -----------------------------------------------------------------------
    // Auth services.
    // -----------------------------------------------------------------------
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUser, CurrentUser>();
    builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
    builder.Services.AddScoped<RefreshTokenIssuer>();
    builder.Services.AddScoped<RefreshCookieWriter>();
    builder.Services.AddScoped<DevCatalogSeeder>();
    builder.Services.AddScoped<DatabaseSeeder>();
    builder.Services.AddScoped<CartService>();
    builder.Services.AddSingleton<OrderStateMachine>();
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddScoped<OrderNumberGenerator>();

    // -----------------------------------------------------------------------
    // File storage — env-switched between local filesystem and Cloudinary.
    // -----------------------------------------------------------------------
    builder.Services.AddOptions<FileStorageOptions>()
        .Bind(builder.Configuration.GetSection(FileStorageOptions.SectionName))
        .ValidateDataAnnotations()
        .ValidateOnStart();

    var storageProvider = builder.Configuration[$"{FileStorageOptions.SectionName}:Provider"] ?? "local";
    if (storageProvider.Equals("cloudinary", StringComparison.OrdinalIgnoreCase))
    {
        builder.Services.AddSingleton<IFileStorageService, CloudinaryFileStorageService>();
    }
    else
    {
        builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
    }

    // -----------------------------------------------------------------------
    // Email — dev defaults to log-only; mailkit kicks in when SMTP is configured.
    // -----------------------------------------------------------------------
    builder.Services.AddOptions<EmailOptions>()
        .Bind(builder.Configuration.GetSection(EmailOptions.SectionName))
        .ValidateDataAnnotations()
        .ValidateOnStart();

    var emailProvider = builder.Configuration[$"{EmailOptions.SectionName}:Provider"] ?? "logonly";
    if (emailProvider.Equals("mailkit", StringComparison.OrdinalIgnoreCase))
    {
        builder.Services.AddSingleton<IEmailSender, MailKitEmailSender>();
    }
    else
    {
        builder.Services.AddSingleton<IEmailSender, LogOnlyEmailSender>();
    }

    // -----------------------------------------------------------------------
    // Coravel — fire-and-forget job queue. Each invocable runs in its own scope.
    // -----------------------------------------------------------------------
    builder.Services.AddQueue();
    builder.Services.AddTransient<SendOrderConfirmationJob>();
    builder.Services.AddTransient<SendPaymentReviewNeededJob>();
    builder.Services.AddTransient<SendStatusChangedJob>();

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

    // ProblemDetails — RFC 7807 contract for every error response.
    builder.Services.AddProblemDetails(options =>
    {
        options.CustomizeProblemDetails = ctx =>
        {
            ctx.ProblemDetails.Extensions.TryAdd("traceId", ctx.HttpContext.TraceIdentifier);
        };
    });

    builder.Services.AddRouting();

    var app = builder.Build();

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
    app.UseCors(CorsPolicy);

    // Static files for the local upload provider — serves payment-proof images
    // under /uploads/* directly from wwwroot/uploads. The Cloudinary provider
    // doesn't need this middleware (it serves from its own CDN).
    var webRoot = app.Environment.WebRootPath ??
                  Path.Combine(app.Environment.ContentRootPath, "wwwroot");
    Directory.CreateDirectory(Path.Combine(webRoot, "uploads"));
    app.UseStaticFiles();

    app.UseAuthentication();
    app.UseAuthorization();

    // -----------------------------------------------------------------------
    // Endpoints.
    // -----------------------------------------------------------------------
    app.MapGet("/api/health", () => Results.Json(new { status = "ok" }))
        .WithName("Health")
        .WithTags("Diagnostics");

    app.MapAuthEndpoints();
    app.MapCatalogEndpoints();
    app.MapCartEndpoints();
    app.MapCheckoutEndpoints();
    app.MapOrderEndpoints();
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
