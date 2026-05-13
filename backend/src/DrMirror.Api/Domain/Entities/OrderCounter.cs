namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// Per-year monotonically-increasing counter used to materialise human-friendly
/// order numbers like <c>DM-2026-000123</c>. One row per calendar year.
/// </summary>
/// <remarks>
/// <para>
/// Concurrency: <c>OrderNumberGenerator</c> serialises access through a
/// process-local <see cref="SemaphoreSlim"/>. That is sufficient for the
/// single-instance MonsterASP.NET hosting target. If/when we go multi-instance,
/// this row should gain a <c>RowVersion</c> column and the generator should
/// retry on <c>DbUpdateConcurrencyException</c>.
/// </para>
/// </remarks>
public class OrderCounter
{
    /// <summary>Primary key — the calendar year, e.g. 2026.</summary>
    public int Year { get; set; }

    /// <summary>Highest order number issued so far for that year.</summary>
    public int LastNumber { get; set; }

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
