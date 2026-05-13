using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("OrderItems");

        builder.HasKey(i => i.Id);

        // ---- Snapshots (frozen at order creation). ---------------------------
        builder.Property(i => i.NameAr).HasMaxLength(200).IsRequired();
        builder.Property(i => i.NameEn).HasMaxLength(200).IsRequired();
        builder.Property(i => i.Sku).HasMaxLength(64).IsRequired();
        builder.Property(i => i.Size).HasMaxLength(16).IsRequired();
        builder.Property(i => i.ColorName).HasMaxLength(64).IsRequired();
        builder.Property(i => i.ColorNameAr).HasMaxLength(64).IsRequired();
        builder.Property(i => i.ColorHex).HasMaxLength(9).IsRequired();
        builder.Property(i => i.PrimaryImageUrl).HasMaxLength(500);

        // ---- Money. ----------------------------------------------------------
        builder.Property(i => i.UnitPrice).HasColumnType("decimal(18,2)");
        builder.Property(i => i.LineTotal).HasColumnType("decimal(18,2)");

        builder.Property(i => i.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // ---- Relationships. --------------------------------------------------
        // Order — owns its items; delete cascades.
        builder.HasOne(i => i.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Product / Variant — restricted on delete; we never lose history.
        builder.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.ProductVariant)
            .WithMany()
            .HasForeignKey(i => i.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(i => i.OrderId);
        builder.HasIndex(i => i.ProductVariantId);
    }
}
