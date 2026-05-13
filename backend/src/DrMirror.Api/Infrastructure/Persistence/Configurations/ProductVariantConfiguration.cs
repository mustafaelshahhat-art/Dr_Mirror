using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> builder)
    {
        builder.ToTable("ProductVariants");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Size).HasMaxLength(16).IsRequired();
        builder.Property(v => v.ColorName).HasMaxLength(60).IsRequired();
        builder.Property(v => v.ColorNameAr).HasMaxLength(60).IsRequired();
        builder.Property(v => v.ColorHex).HasMaxLength(7).IsRequired();
        builder.Property(v => v.Sku).HasMaxLength(64).IsRequired();
        builder.Property(v => v.Stock).HasDefaultValue(0);
        builder.Property(v => v.IsActive).HasDefaultValue(true);
        builder.Property(v => v.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(v => v.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // Variant SKUs are unique across the catalog — they're the canonical buyable identifier.
        builder.HasIndex(v => v.Sku).IsUnique();

        // A given Product can't have two rows for the same Size × Color combo.
        builder.HasIndex(v => new { v.ProductId, v.Size, v.ColorName }).IsUnique();

        // Cheap lookups: "show me all in-stock variants for this product".
        builder.HasIndex(v => new { v.ProductId, v.IsActive });

        // Variants are owned by their parent product; deleting the product
        // removes the entire variant set.
        builder.HasOne(v => v.Product)
            .WithMany(p => p.Variants)
            .HasForeignKey(v => v.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
