using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class ReturnRequestItemConfiguration : IEntityTypeConfiguration<ReturnRequestItem>
{
    public void Configure(EntityTypeBuilder<ReturnRequestItem> builder)
    {
        builder.ToTable("ReturnRequestItems", table =>
        {
            table.HasCheckConstraint("CK_ReturnRequestItems_Quantity_Positive", "[Quantity] > 0");
        });

        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
        builder.Property(i => i.NameAr).HasMaxLength(200).IsRequired();
        builder.Property(i => i.NameEn).HasMaxLength(200).IsUnicode(false).IsRequired();
        builder.Property(i => i.Sku).HasMaxLength(64).IsUnicode(false).IsRequired();
        builder.Property(i => i.Size).HasMaxLength(50).IsUnicode(false).IsRequired();
        builder.Property(i => i.ColorName).HasMaxLength(50).IsUnicode(false).IsRequired();
        builder.Property(i => i.ColorNameAr).HasMaxLength(50).IsRequired();
        builder.Property(i => i.ColorHex).HasMaxLength(7).IsUnicode(false).IsRequired();
        builder.Property(i => i.PrimaryImageUrl).HasMaxLength(500).IsUnicode(false);
        builder.Property(i => i.UnitPrice).HasColumnType("decimal(18,2)");

        builder.HasOne(i => i.ReturnRequest)
            .WithMany(r => r.Items)
            .HasForeignKey(i => i.ReturnRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.OrderItem)
            .WithMany()
            .HasForeignKey(i => i.OrderItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.ProductVariant)
            .WithMany()
            .HasForeignKey(i => i.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(i => i.ReturnRequestId);
        builder.HasIndex(i => i.ProductVariantId);
    }
}
