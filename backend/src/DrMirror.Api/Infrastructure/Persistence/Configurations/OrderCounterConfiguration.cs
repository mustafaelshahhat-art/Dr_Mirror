using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class OrderCounterConfiguration : IEntityTypeConfiguration<OrderCounter>
{
    public void Configure(EntityTypeBuilder<OrderCounter> builder)
    {
        builder.ToTable("OrderCounters");

        // Year IS the primary key — one row per calendar year. We supply the
        // value ourselves; EF must NOT treat it as an IDENTITY column.
        builder.HasKey(c => c.Year);
        builder.Property(c => c.Year).ValueGeneratedNever();

        builder.Property(c => c.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
    }
}
