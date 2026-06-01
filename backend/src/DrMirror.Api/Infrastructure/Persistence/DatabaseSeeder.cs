using System.Security.Cryptography;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence.Seed;
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
    private readonly DevCatalogSeeder _catalogSeeder;
    private readonly GovernorateShippingFeeSeeder _governorateShippingFeeSeeder;

    public DatabaseSeeder(
        AppDbContext db,
        UserManager<User> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IConfiguration config,
        IHostEnvironment env,
        ILogger<DatabaseSeeder> logger,
        DevCatalogSeeder catalogSeeder,
        GovernorateShippingFeeSeeder governorateShippingFeeSeeder)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
        _config = config;
        _env = env;
        _logger = logger;
        _catalogSeeder = catalogSeeder;
        _governorateShippingFeeSeeder = governorateShippingFeeSeeder;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (_env.IsEnvironment("Testing")) return;

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
        await EnsurePaymentMethodsAsync(ct);
        await _governorateShippingFeeSeeder.SeedAsync(ct);
        await EnsureCatalogAsync(ct);
        await MigratePicsumImageUrlsAsync(ct);
    }

    /// <summary>
    /// Idempotently seed the buyer-selectable payment methods.
    /// </summary>
    private async Task EnsurePaymentMethodsAsync(CancellationToken ct)
    {
        // Each method is keyed by its stable Code. Adding a new method on a
        // later boot is a no-op for existing ones.
        var seedMethods = new[]
        {
            new PaymentMethod
            {
                Id = Guid.NewGuid(),
                Code = "cod",
                Kind = Domain.Orders.PaymentMethodKind.Cod,
                NameEn = "Cash on Delivery",
                NameAr = "الدفع عند الاستلام",
                InstructionsEn = "Pay in cash to the courier when your order arrives.",
                InstructionsAr = "ادفع نقدًا لمندوب الشحن عند استلام الطلب.",
                IsActive = true,
                DisplayOrder = 0,
            },
            new PaymentMethod
            {
                Id = Guid.NewGuid(),
                Code = "instapay",
                Kind = Domain.Orders.PaymentMethodKind.Instapay,
                NameEn = "Instapay",
                NameAr = "إنستاباي",
                InstructionsEn = "Transfer the total to the Instapay handle below, then upload a screenshot of the receipt.",
                InstructionsAr = "حوّل المبلغ إلى حساب إنستاباي التالي، ثم ارفع لقطة شاشة من إيصال التحويل.",
                AccountNumber = "drmirror@instapay",
                AccountHolder = "Dr.Mirror Sales",
                // Seeded inactive — placeholder account numbers must be updated in the
                // admin panel before activating in production.
                IsActive = false,
                DisplayOrder = 1,
            },
            new PaymentMethod
            {
                Id = Guid.NewGuid(),
                Code = "wallet",
                Kind = Domain.Orders.PaymentMethodKind.Wallet,
                NameEn = "Mobile Wallet",
                NameAr = "محفظة إلكترونية",
                InstructionsEn = "Send the total to the wallet number below (Vodafone Cash / Etisalat Cash / Orange Money / We Pay) and upload the confirmation.",
                InstructionsAr = "حوّل المبلغ إلى رقم المحفظة التالي (فودافون كاش / اتصالات كاش / أورنج موني / وي باي) وارفع لقطة شاشة من التأكيد.",
                AccountNumber = "01001234567",
                AccountHolder = "Dr.Mirror Sales",
                // Seeded inactive — placeholder account numbers must be updated in the
                // admin panel before activating in production.
                IsActive = false,
                DisplayOrder = 2,
            },
        };

        var existingCodes = await _db.PaymentMethods
            .Select(m => m.Code)
            .ToListAsync(ct);

        var toAdd = seedMethods.Where(m => !existingCodes.Contains(m.Code)).ToList();
        if (toAdd.Count == 0) return;

        _db.PaymentMethods.AddRange(toAdd);
        await _db.SaveChangesAsync(ct);

        foreach (var m in toAdd)
        {
            _logger.LogInformation("Seeded payment method: {Code} ({NameEn})", m.Code, m.NameEn);
        }
    }

    /// <summary>
    /// In Development with <c>Catalog:SeedSamples=true</c>, populate a small
    /// catalog so the SPA has data to render. Idempotent — skips if any
    /// products already exist.
    /// </summary>
    private async Task EnsureCatalogAsync(CancellationToken ct)
    {
        if (!_env.IsDevelopment()) return;

        var enabled = _config.GetValue("Catalog:SeedSamples", false);
        if (!enabled) return;

        await _catalogSeeder.SeedAsync(ct);
    }

    /// <summary>
    /// One-time migration: replace any leftover picsum.photos placeholder image
    /// URLs with curated Unsplash medical-uniform photography. Idempotent —
    /// skips if no picsum URLs remain. Runs in all environments so production
    /// databases seeded during development are also fixed.
    /// </summary>
    private async Task MigratePicsumImageUrlsAsync(CancellationToken ct)
    {
        var picsumImages = await _db.ProductImages
            .Include(pi => pi.Product)
                .ThenInclude(p => p!.Category)
            .Where(pi => pi.Url.Contains("picsum.photos"))
            .ToListAsync(ct);

        if (picsumImages.Count == 0) return;

        foreach (var img in picsumImages)
        {
            var product = img.Product!;
            var categorySlug = product.Category?.Slug ?? "scrub-tops";

            // Extract colour name from the Alt text pattern "Product Name — Color"
            var colorName = "navy"; // fallback
            var dashIdx = img.Alt?.IndexOf('—') ?? -1;
            if (dashIdx >= 0 && img.Alt is not null)
            {
                colorName = img.Alt[(dashIdx + 1)..].Trim();
            }

            var urls = Seed.DevCatalogSeeder.Images.GetUrls(
                product.Slug, colorName, categorySlug, count: 1);
            img.Url = urls[0];
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Migrated {Count} product images from picsum.photos → Unsplash.",
            picsumImages.Count);
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

        // Production must never auto-generate a password — the plaintext would be
        // emitted to the log file. Require the operator to supply one explicitly.
        if (generated && _env.IsProduction())
            throw new InvalidOperationException(
                "Admin:SeedPassword is required in production. " +
                "Set the Admin__SeedPassword environment variable before first boot.");

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
