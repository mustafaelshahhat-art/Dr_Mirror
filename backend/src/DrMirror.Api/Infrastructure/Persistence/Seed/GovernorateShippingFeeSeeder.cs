using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.Persistence.Seed;

public sealed class GovernorateShippingFeeSeeder
{
    private readonly AppDbContext _db;
    private readonly ILogger<GovernorateShippingFeeSeeder> _logger;

    public GovernorateShippingFeeSeeder(AppDbContext db, ILogger<GovernorateShippingFeeSeeder> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var existingSlugs = await _db.GovernorateShippingFees
            .Select(g => g.Slug)
            .ToListAsync(ct);

        var toAdd = Governorates.All
            .Where(g => !existingSlugs.Contains(g.Slug))
            .Select(g => new GovernorateShippingFee
            {
                Id = Guid.NewGuid(),
                Slug = g.Slug,
                NameEn = g.NameEn,
                NameAr = g.NameAr,
                Fee = 0m,
                IsActive = true,
                UpdatedAt = DateTimeOffset.UtcNow,
            })
            .ToList();

        if (toAdd.Count == 0) return;

        _db.GovernorateShippingFees.AddRange(toAdd);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Seeded {Count} governorate shipping fee rows.", toAdd.Count);
    }
}
