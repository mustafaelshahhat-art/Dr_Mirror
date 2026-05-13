using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.Common;

/// <summary>
/// Yields the next human-friendly order number — <c>DM-{YYYY}-{6-digit counter}</c>.
/// </summary>
/// <remarks>
/// <para>
/// Concurrency is serialised within the process via a static
/// <see cref="SemaphoreSlim"/>. That is sufficient for the single-instance
/// MonsterASP.NET hosting target. A multi-instance deployment would need
/// either a database-side <c>SEQUENCE</c> or a row-version retry loop on
/// <see cref="OrderCounter"/>.
/// </para>
/// </remarks>
public sealed class OrderNumberGenerator
{
    private static readonly SemaphoreSlim _gate = new(1, 1);

    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public OrderNumberGenerator(AppDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<string> NextAsync(CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var year = _clock.GetUtcNow().Year;

            var row = await _db.OrderCounters.FirstOrDefaultAsync(c => c.Year == year, ct);
            if (row is null)
            {
                row = new OrderCounter { Year = year, LastNumber = 0 };
                _db.OrderCounters.Add(row);
            }

            row.LastNumber += 1;
            row.UpdatedAt = _clock.GetUtcNow();

            await _db.SaveChangesAsync(ct);

            return $"DM-{year:D4}-{row.LastNumber:D6}";
        }
        finally
        {
            _gate.Release();
        }
    }
}
