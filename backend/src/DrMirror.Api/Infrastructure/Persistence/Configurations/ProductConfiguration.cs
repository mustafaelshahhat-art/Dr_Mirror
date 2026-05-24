using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.NameAr).HasMaxLength(180).IsRequired();
        builder.Property(p => p.NameEn).HasMaxLength(180).IsRequired();
        builder.Property(p => p.Slug).HasMaxLength(200).IsRequired();
        builder.Property(p => p.DescriptionAr).HasMaxLength(4000).IsRequired();
        builder.Property(p => p.DescriptionEn).HasMaxLength(4000).IsRequired();

        // Egyptian pound, two decimal places, never floating-point arithmetic on prices.
        builder.Property(p => p.Price).HasColumnType("decimal(18,2)");

        builder.Property(p => p.Gender).HasConversion<int>();
        builder.Property(p => p.Material).HasMaxLength(200);
        builder.Property(p => p.Brand).HasMaxLength(80);
        builder.Property(p => p.Sku).HasMaxLength(64);
        builder.Property(p => p.IsPublished).HasDefaultValue(false);
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(p => p.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(p => p.RowVersion).IsRowVersion().IsConcurrencyToken();

        // Slug → URL contract; must be unique across the catalog.
        builder.HasIndex(p => p.Slug).IsUnique();
        builder.HasIndex(p => p.CategoryId).HasDatabaseName("IX_Products_CategoryId");

        // Public listings always filter on (IsPublished, CategoryId, CreatedAt) — composite index pays off fast.
        builder.HasIndex(p => new { p.IsPublished, p.CategoryId, p.CreatedAt });
        builder.HasIndex(p => new { p.CategoryId, p.IsPublished, p.CreatedAt })
            .HasDatabaseName("IX_Product_CategoryId_IsActive_CreatedAtUtc")
            .IsDescending(false, false, true);

        // Restrict deletion of a category that still has products — admin must
        // either reassign or unpublish before removing the category.
        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
