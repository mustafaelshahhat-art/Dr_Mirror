using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class PaymentMethodConfiguration : IEntityTypeConfiguration<PaymentMethod>
{
    public void Configure(EntityTypeBuilder<PaymentMethod> builder)
    {
        builder.ToTable("PaymentMethods");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Code).HasMaxLength(32).IsRequired();
        builder.HasIndex(m => m.Code).IsUnique();

        builder.Property(m => m.Kind).HasConversion<int>();

        builder.Property(m => m.NameAr).HasMaxLength(64).IsRequired();
        builder.Property(m => m.NameEn).HasMaxLength(64).IsRequired();

        builder.Property(m => m.InstructionsAr).HasMaxLength(500);
        builder.Property(m => m.InstructionsEn).HasMaxLength(500);

        builder.Property(m => m.AccountNumber).HasMaxLength(64);
        builder.Property(m => m.AccountHolder).HasMaxLength(100);

        builder.Property(m => m.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(m => m.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(m => new { m.IsActive, m.DisplayOrder });
    }
}
