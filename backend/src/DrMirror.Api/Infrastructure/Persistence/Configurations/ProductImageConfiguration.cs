using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class ProductImageConfiguration : IEntityTypeConfiguration<ProductImage>
{
    public void Configure(EntityTypeBuilder<ProductImage> builder)
    {
        builder.ToTable("ProductImages");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Url).HasMaxLength(500).IsRequired();
        builder.Property(i => i.Alt).HasMaxLength(180);
        builder.Property(i => i.DisplayOrder).HasDefaultValue(0);
        builder.Property(i => i.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // Most queries pull all images for a product, ordered by DisplayOrder.
        builder.HasIndex(i => new { i.ProductId, i.DisplayOrder });

        // Deleting a product deletes its gallery — image rows have no value
        // detached from the parent product.
        builder.HasOne(i => i.Product)
            .WithMany(p => p.Images)
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
