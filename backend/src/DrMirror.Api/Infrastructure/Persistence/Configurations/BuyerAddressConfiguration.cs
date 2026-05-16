using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class BuyerAddressConfiguration : IEntityTypeConfiguration<BuyerAddress>
{
    public void Configure(EntityTypeBuilder<BuyerAddress> builder)
    {
        builder.ToTable("BuyerAddresses");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Label).HasMaxLength(64).IsRequired();
        builder.Property(a => a.RecipientName).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Phone).HasMaxLength(32).IsRequired();
        builder.Property(a => a.Governorate).HasMaxLength(100).IsRequired();
        builder.Property(a => a.City).HasMaxLength(100).IsRequired();
        builder.Property(a => a.StreetAddress).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Floor).HasMaxLength(50);
        builder.Property(a => a.Apartment).HasMaxLength(50);
        builder.Property(a => a.Landmark).HasMaxLength(200);
        builder.Property(a => a.Notes).HasMaxLength(500);

        builder.Property(a => a.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(a => a.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // Deleting the user wipes their address book — addresses have no
        // value detached from their owner.
        builder.HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Most queries pull "my addresses" — index by user, sort by default-first.
        builder.HasIndex(a => new { a.UserId, a.IsDefault });

        // DB-level guarantee: at most one IsDefault=true row per user.
        // Complements the application-layer ClearOtherDefaults() guard against races.
        builder.HasIndex(a => a.UserId)
            .HasFilter("[IsDefault] = 1")
            .IsUnique()
            .HasDatabaseName("IX_BuyerAddresses_UserId_UniqueDefault");
    }
}
