using System.Diagnostics;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Catalog;

[Trait("PerfSmoke", "true")]
[Collection(IntegrationTestCollection.Name)]
public class CatalogPerfSmokeTests : IClassFixture<CatalogPerfSmokeTests.Factory>
{
    private const int TrialCount = 50;
    private static readonly long MaxP95Ms = 500;

    private readonly Factory _factory;

    public CatalogPerfSmokeTests(Factory factory) => _factory = factory;

    [Fact]
    public async Task Catalog_list_and_detail_p95_under_500ms()
    {
        if (Environment.GetEnvironmentVariable("DRMIRROR_PERF_SMOKE") != "1")
            return;

        await _factory.SeedProductsAsync();
        var client = _factory.CreateClient();

        // warm cache: list + detail
        await client.GetAsync("/api/catalog/products?pageSize=5");
        await client.GetAsync($"/api/catalog/products/{_factory.Slug}");

        // timed trials: list
        var listTimes = new List<long>(TrialCount);
        for (var i = 0; i < TrialCount; i++)
        {
            var sw = Stopwatch.StartNew();
            using var response = await client.GetAsync("/api/catalog/products?pageSize=5");
            sw.Stop();
            response.EnsureSuccessStatusCode();
            listTimes.Add(sw.ElapsedMilliseconds);
        }

        // timed trials: detail
        var detailTimes = new List<long>(TrialCount);
        for (var i = 0; i < TrialCount; i++)
        {
            var sw = Stopwatch.StartNew();
            using var response = await client.GetAsync($"/api/catalog/products/{_factory.Slug}");
            sw.Stop();
            response.EnsureSuccessStatusCode();
            detailTimes.Add(sw.ElapsedMilliseconds);
        }

        var listP95 = P95(listTimes);
        var detailP95 = P95(detailTimes);

        Assert.True(listP95 <= MaxP95Ms,
            $"Catalog list p95={listP95}ms exceeded {MaxP95Ms}ms");
        Assert.True(detailP95 <= MaxP95Ms,
            $"Catalog detail p95={detailP95}ms exceeded {MaxP95Ms}ms");
    }

    private static long P95(List<long> samples)
    {
        samples.Sort();
        var idx = (int)Math.Ceiling(0.95 * samples.Count) - 1;
        return samples[Math.Max(0, Math.Min(idx, samples.Count - 1))];
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "CatalogPerfSmoke_" + Guid.NewGuid();
        public string Slug { get; private set; } = string.Empty;
        private bool _seeded;

        public async Task SeedProductsAsync()
        {
            if (_seeded) return;
            _seeded = true;

            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cat = new Category
            {
                Id = Guid.NewGuid(),
                NameEn = "Perf Cat",
                NameAr = "Perf Cat",
                Slug = $"perf-cat-{Guid.NewGuid()}",
                IsActive = true,
            };
            db.Categories.Add(cat);

            var slug = $"perf-prod-{Guid.NewGuid()}";
            Slug = slug;
            db.Products.Add(new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = cat.Id,
                NameEn = "Perf Product",
                NameAr = "Perf Product",
                Slug = slug,
                IsPublished = true,
                Price = 100,
            });
            await db.SaveChangesAsync();
        }
    }
}
