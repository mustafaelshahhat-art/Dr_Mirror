using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

public sealed class PhoneVerificationOtpConfiguration : IEntityTypeConfiguration<PhoneVerificationOtp>
{
    public void Configure(EntityTypeBuilder<PhoneVerificationOtp> builder)
    {
        builder.ToTable("PhoneVerificationOtps");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(6).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Purpose).HasMaxLength(20).IsRequired();
        builder.Property(x => x.ExpiresAt).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.HasIndex(x => new { x.UserId, x.ExpiresAt })
            .HasDatabaseName("IX_PhoneVerificationOtps_UserId_ExpiresAt");
    }
}
