using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class PasswordResetRequestConfiguration : IEntityTypeConfiguration<PasswordResetRequest>
{
    public void Configure(EntityTypeBuilder<PasswordResetRequest> builder)
    {
        builder.ToTable("PasswordResetRequests");

        builder.HasKey(pr => pr.Id);

        builder.Property(pr => pr.TokenHash)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(pr => pr.ExpiresAt).IsRequired();
        builder.Property(pr => pr.CreatedAt).IsRequired();
        builder.Property(pr => pr.IsUsed).HasDefaultValue(false);
        builder.Property(pr => pr.IsSuperSeded).HasDefaultValue(false);

        builder.HasIndex(pr => new { pr.UserId, pr.IsUsed, pr.IsSuperSeded });
        builder.HasIndex(pr => pr.TokenHash);

        builder.HasOne(pr => pr.User)
            .WithMany()
            .HasForeignKey(pr => pr.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
