using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class PaymentProofConfiguration : IEntityTypeConfiguration<PaymentProof>
{
    public void Configure(EntityTypeBuilder<PaymentProof> builder)
    {
        builder.ToTable("PaymentProofs");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.FileUrl).HasMaxLength(500).IsRequired();
        builder.Property(p => p.FileKey).HasMaxLength(500).IsRequired();
        builder.Property(p => p.ContentType).HasMaxLength(100).IsRequired();
        builder.Property(p => p.Status).HasConversion<int>();
        builder.Property(p => p.ReviewNote).HasMaxLength(1000);
        builder.Property(p => p.UploadedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // Cascade with the order — deleting the order purges proofs.
        builder.HasOne(p => p.Order)
            .WithMany(o => o.PaymentProofs)
            .HasForeignKey(p => p.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Reviewer — restrict; we never want to lose audit history when a user is removed.
        builder.HasOne(p => p.ReviewedByUser)
            .WithMany()
            .HasForeignKey(p => p.ReviewedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.OrderId);
        builder.HasIndex(p => new { p.Status, p.UploadedAt });
    }
}
