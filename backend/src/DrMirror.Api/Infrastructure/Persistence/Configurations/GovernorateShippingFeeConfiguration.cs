using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class GovernorateShippingFeeConfiguration : IEntityTypeConfiguration<GovernorateShippingFee>
{
    public void Configure(EntityTypeBuilder<GovernorateShippingFee> builder)
    {
        builder.ToTable("GovernorateShippingFees", table =>
        {
            table.HasCheckConstraint("CK_GovernorateShippingFees_Fee_NonNegative", "[Fee] >= 0");
        });

        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
        builder.Property(g => g.Slug).HasMaxLength(64).IsUnicode(false).IsRequired();
        builder.Property(g => g.NameEn).HasMaxLength(100).IsUnicode(false).IsRequired();
        builder.Property(g => g.NameAr).HasMaxLength(100).IsRequired();
        builder.Property(g => g.Fee).HasColumnType("decimal(18,2)");
        builder.Property(g => g.IsActive).HasDefaultValue(true);
        builder.Property(g => g.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(g => g.RowVersion).IsRowVersion().IsConcurrencyToken();

        builder.HasOne(g => g.LastUpdatedByAdmin)
            .WithMany()
            .HasForeignKey(g => g.LastUpdatedByAdminId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(g => g.Slug).IsUnique();
        builder.HasIndex(g => g.IsActive);
    }
}
