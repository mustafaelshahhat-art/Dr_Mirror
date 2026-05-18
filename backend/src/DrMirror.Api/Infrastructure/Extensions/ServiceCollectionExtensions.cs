using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Persistence.Seed;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Api.Shared.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Caching.Memory;

namespace DrMirror.Api.Infrastructure.Extensions;

internal static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers JWT options validation, the Bearer auth scheme, and the authorization
    /// middleware. Throws at startup if <c>Jwt:Secret</c> is missing.
    /// </summary>
    internal static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<JwtOptions>()
            .Bind(config.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton(sp => sp.GetRequiredService<IOptions<JwtOptions>>().Value);

        var jwtSection = config.GetSection(JwtOptions.SectionName);
        var jwtSecret = jwtSection["Secret"]
            ?? throw new InvalidOperationException(
                "Jwt:Secret is required. " +
                "In dev: dotnet user-secrets set \"Jwt:Secret\" \"<base64-or-long-random>\".");
        var jwtIssuer = jwtSection["Issuer"] ?? "drmirror.local";
        var jwtAudience = jwtSection["Audience"] ?? "drmirror.local";

        services
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
                options.MapInboundClaims = false;
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var services = context.HttpContext.RequestServices;
                        var cache = services.GetRequiredService<IMemoryCache>();
                        var userManager = services.GetRequiredService<UserManager<User>>();

                        var userId = context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                        if (!Guid.TryParse(userId, out var id))
                        {
                            context.Fail("The access token does not identify a valid user.");
                            return;
                        }

                        var cacheKey = $"OnTokenValidated:{id}";
                        if (!cache.TryGetValue(cacheKey, out User? cached))
                        {
                            var user = await userManager.FindByIdAsync(id.ToString());
                            cached = user;
                            cache.Set(cacheKey, cached, TimeSpan.FromSeconds(30));
                        }

                        if (cached is null || cached.IsDisabled)
                        {
                            context.Fail("The access token user is no longer active.");
                            return;
                        }

                        var tokenStamp = context.Principal?.FindFirst(JwtTokenService.SecurityStampClaimType)?.Value;
                        var currentStamp = cached.SecurityStamp ?? string.Empty;
                        if (!string.Equals(tokenStamp, currentStamp, StringComparison.Ordinal))
                        {
                            context.Fail("The access token has been invalidated.");
                        }
                    },
                };
            });

        services.AddAuthorization();
        return services;
    }

    /// <summary>
    /// Registers email options, the provider-switched <see cref="IEmailSender"/>,
    /// and the durable <see cref="EmailOutboxProcessor"/> background service.
    /// Defaults to log-only when <c>Email:Provider</c> is absent.
    /// </summary>
    internal static IServiceCollection AddEmailServices(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<EmailOptions>()
            .Bind(config.GetSection(EmailOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        var emailProvider = config[$"{EmailOptions.SectionName}:Provider"] ?? "logonly";
        if (emailProvider.Equals("mailkit", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IEmailSender, MailKitEmailSender>();
        else
            services.AddSingleton<IEmailSender, LogOnlyEmailSender>();

        services.AddHostedService<EmailOutboxProcessor>();
        return services;
    }

    /// <summary>
    /// Registers file-storage options and the provider-switched <see cref="IFileStorageService"/>.
    /// Defaults to local filesystem when <c>FileStorage:Provider</c> is absent.
    /// </summary>
    internal static IServiceCollection AddStorageServices(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddHttpClient();
        services.AddHttpClient(nameof(CloudinaryFileStorageService), client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        services.AddOptions<FileStorageOptions>()
            .Bind(config.GetSection(FileStorageOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        var storageProvider = config[$"{FileStorageOptions.SectionName}:Provider"] ?? "local";
        if (storageProvider.Equals("cloudinary", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IFileStorageService, CloudinaryFileStorageService>();
        else
            services.AddSingleton<IFileStorageService, LocalFileStorageService>();

        return services;
    }

    /// <summary>
    /// Registers ASP.NET Core Identity with the project's password policy, lockout
    /// settings, and sign-in constraints. Does not register any auth scheme —
    /// that is done separately by <see cref="AddJwtAuthentication"/>.
    /// </summary>
    internal static IServiceCollection AddIdentityServices(this IServiceCollection services)
    {
        services
            .AddIdentityCore<User>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;
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

        return services;
    }

    /// <summary>
    /// Registers the application-level scoped and singleton services: current-user
    /// accessor, JWT token service, refresh token helpers, seeding, cart service,
    /// order state machine, and order number generator.
    /// </summary>
    internal static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddHttpContextAccessor();
        services.AddAdminAuditServices();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<RefreshTokenIssuer>();
        services.AddScoped<RefreshCookieWriter>();
        services.AddScoped<DevCatalogSeeder>();
        services.AddScoped<DatabaseSeeder>();
        services.AddScoped<CartService>();
        services.AddSingleton<OrderStateMachine>();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<OrderNumberGenerator>();
        return services;
    }

    /// <summary>
    /// Registers all named rate-limit policies used by the API endpoints.
    /// </summary>
    internal static IServiceCollection AddRateLimitingPolicies(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Login + register — 10 req/60 s per IP (sliding window).
            options.AddSlidingWindowLimiter(RateLimitPolicies.AuthStrict, o =>
            {
                o.Window = TimeSpan.FromMinutes(1);
                o.SegmentsPerWindow = 6;
                o.PermitLimit = 10;
                o.QueueLimit = 0;
                o.AutoReplenishment = true;
            });

            // Token refresh — 30 req/60 s per IP (sliding window).
            options.AddSlidingWindowLimiter(RateLimitPolicies.AuthRefresh, o =>
            {
                o.Window = TimeSpan.FromMinutes(1);
                o.SegmentsPerWindow = 6;
                o.PermitLimit = 30;
                o.QueueLimit = 0;
                o.AutoReplenishment = true;
            });

            // Inquiry submit — 5 req/60 s per IP (fixed window).
            options.AddFixedWindowLimiter(RateLimitPolicies.InquirySubmit, o =>
            {
                o.Window = TimeSpan.FromMinutes(1);
                o.PermitLimit = 5;
                o.QueueLimit = 0;
                o.AutoReplenishment = true;
            });

            // Admin API — 120 req/60 s per user (fixed window, defense-in-depth).
            options.AddFixedWindowLimiter(RateLimitPolicies.AdminApi, o =>
            {
                o.Window = TimeSpan.FromMinutes(1);
                o.PermitLimit = 120;
                o.QueueLimit = 0;
                o.AutoReplenishment = true;
            });

            // Payment-proof upload — 10 req/5 min per user (fixed window).
            options.AddPolicy(RateLimitPolicies.ProofUpload, context =>
            {
                var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? context.Connection.RemoteIpAddress?.ToString()
                    ?? "anonymous";
                return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
                {
                    Window = TimeSpan.FromMinutes(5),
                    PermitLimit = 10,
                    QueueLimit = 0,
                    AutoReplenishment = true,
                });
            });

            // Payment-proof file read — 60 req/1 min per IP (sliding window).
            options.AddPolicy(RateLimitPolicies.ProofFileRead, context =>
            {
                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetSlidingWindowLimiter(ip, _ => new SlidingWindowRateLimiterOptions
                {
                    Window = TimeSpan.FromMinutes(1),
                    SegmentsPerWindow = 6,
                    PermitLimit = 60,
                    QueueLimit = 0,
                    AutoReplenishment = true,
                });
            });

            // Emit RFC 7807 ProblemDetails so the SPA's shared
            // isAxiosError&lt;ProblemDetails&gt; path handles 429 like every other
            // failure (rather than seeing an opaque text body).
            options.OnRejected = async (ctx, ct) =>
            {
                var http = ctx.HttpContext;
                http.Response.StatusCode = StatusCodes.Status429TooManyRequests;

                if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry))
                {
                    http.Response.Headers.RetryAfter = ((int)retry.TotalSeconds)
                        .ToString(CultureInfo.InvariantCulture);
                }

                var problem = new ProblemDetails
                {
                    Type = "https://tools.ietf.org/html/rfc6585#section-4",
                    Title = "Too Many Requests",
                    Status = StatusCodes.Status429TooManyRequests,
                    Detail = "Too many requests. Please slow down and try again later.",
                    Instance = http.Request.Path,
                };

                var pds = http.RequestServices.GetService<IProblemDetailsService>();
                if (pds is not null)
                {
                    await pds.WriteAsync(new ProblemDetailsContext
                    {
                        HttpContext = http,
                        ProblemDetails = problem,
                    });
                    return;
                }

                http.Response.ContentType = "application/problem+json";
                await http.Response.WriteAsJsonAsync(problem, cancellationToken: ct);
            };
        });

        return services;
    }
}
