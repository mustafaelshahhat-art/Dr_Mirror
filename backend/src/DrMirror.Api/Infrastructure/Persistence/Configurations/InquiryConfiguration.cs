using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

public sealed class InquiryConfiguration : IEntityTypeConfiguration<Inquiry>
{
    public void Configure(EntityTypeBuilder<Inquiry> b)
    {
        b.HasKey(i => i.Id);

        b.Property(i => i.FullName).IsRequired().HasMaxLength(100);
        b.Property(i => i.Email).IsRequired().HasMaxLength(200);
        b.Property(i => i.Phone).HasMaxLength(30);
        b.Property(i => i.Subject).IsRequired().HasMaxLength(200);
        b.Property(i => i.Message).IsRequired().HasMaxLength(2000);
        b.Property(i => i.Status).IsRequired();

        b.HasIndex(i => i.Status);
        b.HasIndex(i => i.CreatedAt);

        b.HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasOne(i => i.ReadByUser)
            .WithMany()
            .HasForeignKey(i => i.ReadByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
