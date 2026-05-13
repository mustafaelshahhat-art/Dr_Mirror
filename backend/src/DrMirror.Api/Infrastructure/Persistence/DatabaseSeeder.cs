using System.Security.Cryptography;
using System.Text;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.Persistence;

/// <summary>
/// Run once at startup.
///   1. In Development, applies any pending EF migrations.
///   2. Ensures the three application roles (Admin, Vendor, Buyer) exist.
///   3. Ensures the seed admin account exists. If <c>Admin:SeedPassword</c>
///      is not configured, generates a strong random password and logs it
///      EXACTLY ONCE at warning level. The password is never persisted in
///      plaintext — only Identity's hash lives in the database.
///
/// Idempotent. Safe to run on every startup.
/// </summary>
public sealed class DatabaseSeeder
{
    private readonly AppDbContext _db;
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(
        AppDbContext db,
        UserManager<User> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IConfiguration config,
        IHostEnvironment env,
        ILogger<DatabaseSeeder> logger)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
        _config = config;
        _env = env;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (_env.IsDevelopment())
        {
            // Auto-migrate in dev so the workflow is `dotnet run` and nothing else.
            // In prod, migrations are a deployment step; never auto-apply.
            var pending = await _db.Database.GetPendingMigrationsAsync(ct);
            if (pending.Any())
            {
                _logger.LogInformation("Applying {Count} pending EF migrations...", pending.Count());
                await _db.Database.MigrateAsync(ct);
            }
        }

        await EnsureRolesAsync();
        await EnsureAdminAsync();
    }

    private async Task EnsureRolesAsync()
    {
        foreach (var role in UserRoles.All)
        {
            if (await _roleManager.RoleExistsAsync(role)) continue;

            var result = await _roleManager.CreateAsync(new IdentityRole<Guid>(role)
            {
                Id = Guid.NewGuid(),
                NormalizedName = role.ToUpperInvariant(),
            });
            if (!result.Succeeded)
            {
                _logger.LogError("Failed to create role {Role}: {Errors}",
                    role, string.Join("; ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    private async Task EnsureAdminAsync()
    {
        var email = _config["Admin:SeedEmail"] ?? "admin@drmirror.local";

        var existing = await _userManager.FindByEmailAsync(email);
        if (existing is not null)
        {
            // Idempotent: admin already exists, nothing to do. We deliberately
            // do NOT overwrite the password — rotating a config value should
            // never silently change the database.
            return;
        }

        var configuredPassword = _config["Admin:SeedPassword"];
        var generated = string.IsNullOrEmpty(configuredPassword);
        var password = generated ? GenerateStrongPassword() : configuredPassword!;

        var admin = new User
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            FullName = "Administrator",
            EmailConfirmed = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var create = await _userManager.CreateAsync(admin, password);
        if (!create.Succeeded)
        {
            _logger.LogError(
                "Admin seeding failed: {Errors}",
                string.Join("; ", create.Errors.Select(e => e.Description)));
            return;
        }

        var assign = await _userManager.AddToRoleAsync(admin, UserRoles.Admin);
        if (!assign.Succeeded)
        {
            _logger.LogError(
                "Admin role assignment failed: {Errors}",
                string.Join("; ", assign.Errors.Select(e => e.Description)));
        }

        if (generated)
        {
            // This is the ONLY place the plaintext password is ever emitted.
            // The Warning level guarantees it appears even on quiet log levels.
            _logger.LogWarning(
                "\n" +
                "================================================================================\n" +
                "  Dr_Mirror admin account created\n" +
                "  Email:    {Email}\n" +
                "  Password: {Password}\n" +
                "\n" +
                "  This password is shown ONCE. Save it now.\n" +
                "  To set a fixed password instead, run:\n" +
                "    dotnet user-secrets set \"Admin:SeedPassword\" \"<your-password>\"\n" +
                "  (or set the Admin__SeedPassword environment variable) and recreate the user.\n" +
                "================================================================================",
                email, password);
        }
        else
        {
            _logger.LogInformation("Admin account created from configured Admin:SeedPassword (email={Email})", email);
        }
    }

    /// <summary>
    /// 24-char password drawn from a non-ambiguous alphabet, with at least
    /// one upper / lower / digit / symbol so it clears any Identity policy
    /// without retries.
    /// </summary>
    private static string GenerateStrongPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // omits I, O
        const string lower = "abcdefghijkmnopqrstuvwxyz"; // omits l
        const string digits = "23456789";                  // omits 0, 1
        const string symbols = "!@#$%^&*-_=+";
        const string all = upper + lower + digits + symbols;

        const int len = 24;
        Span<char> buf = stackalloc char[len];
        for (var i = 0; i < len; i++)
        {
            buf[i] = all[RandomNumberGenerator.GetInt32(all.Length)];
        }

        // Guarantee one of each class in the first four positions, then shuffle.
        buf[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        buf[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        buf[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        buf[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];

        // Fisher–Yates shuffle so the guaranteed-class chars are not always at 0..3.
        for (var i = len - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (buf[i], buf[j]) = (buf[j], buf[i]);
        }

        return new string(buf);
    }
}
