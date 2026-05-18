using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class OrderIdempotencyKeyConfiguration : IEntityTypeConfiguration<OrderIdempotencyKey>
{
    public void Configure(EntityTypeBuilder<OrderIdempotencyKey> builder)
    {
        builder.ToTable("OrderIdempotencyKeys");
        builder.HasKey(k => k.Key);
        builder.Property(k => k.CreatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(k => k.Order)
            .WithMany()
            .HasForeignKey(k => k.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(k => k.User)
            .WithMany()
            .HasForeignKey(k => k.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(k => new { k.UserId, k.CreatedAtUtc })
            .HasDatabaseName("IX_OrderIdempotencyKeys_UserId_CreatedAt")
            .IsDescending(false, true);
    }
}
