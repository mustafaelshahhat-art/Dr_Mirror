using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class PhoneVerificationOtpConfiguration : IEntityTypeConfiguration<PhoneVerificationOtp>
{
    public void Configure(EntityTypeBuilder<PhoneVerificationOtp> builder)
    {
        builder.ToTable("PhoneVerificationOtps");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.PhoneNumber).HasMaxLength(11).IsRequired();
        builder.Property(o => o.CodeHash).HasMaxLength(64).IsRequired();
        builder.Property(o => o.Purpose).IsRequired();
        builder.Property(o => o.ExpiresAt).IsRequired();
        builder.Property(o => o.CreatedAt).IsRequired();
        builder.Property(o => o.SendStatus).HasDefaultValue(PhoneVerificationOtpSendStatus.Sending);
        builder.Property(o => o.SendFailureReason).HasMaxLength(100);

        builder.HasIndex(o => new { o.UserId, o.PhoneNumber });

        builder.HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
