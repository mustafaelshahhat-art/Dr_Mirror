using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class ReturnRequestConfiguration : IEntityTypeConfiguration<ReturnRequest>
{
    public void Configure(EntityTypeBuilder<ReturnRequest> builder)
    {
        builder.ToTable("ReturnRequests");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
        builder.Property(r => r.Status).HasConversion<int>();
        builder.Property(r => r.CustomerReason).HasMaxLength(1000).IsRequired();
        builder.Property(r => r.AdminNote).HasMaxLength(1000);
        builder.Property(r => r.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(r => r.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(r => r.RowVersion).IsRowVersion().IsConcurrencyToken();

        builder.HasOne(r => r.Order)
            .WithMany()
            .HasForeignKey(r => r.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.BuyerUser)
            .WithMany()
            .HasForeignKey(r => r.BuyerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.ReviewedByAdmin)
            .WithMany()
            .HasForeignKey(r => r.ReviewedByAdminId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => r.OrderId)
            .HasDatabaseName("UQ_ReturnRequests_ActivePerOrder")
            .HasFilter("[Status] IN (1, 2, 4)")
            .IsUnique();
        builder.HasIndex(r => new { r.BuyerUserId, r.Status });
        builder.HasIndex(r => new { r.Status, r.CreatedAt });
    }
}
