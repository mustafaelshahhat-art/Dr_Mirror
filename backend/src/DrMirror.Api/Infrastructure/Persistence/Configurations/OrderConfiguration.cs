using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        builder.HasKey(o => o.Id);

        // ---- Money — never floating point. ------------------------------------
        builder.Property(o => o.SubTotal).HasColumnType("decimal(18,2)");
        builder.Property(o => o.ShippingFee).HasColumnType("decimal(18,2)");
        builder.Property(o => o.Total).HasColumnType("decimal(18,2)");
        builder.Property(o => o.Currency).HasMaxLength(3).IsRequired();

        // ---- Order number — friendly + unique. --------------------------------
        builder.Property(o => o.OrderNumber).HasMaxLength(32).IsRequired();
        builder.HasIndex(o => o.OrderNumber).IsUnique();

        // ---- Status — store as int so changing enum values is non-breaking. ---
        builder.Property(o => o.Status).HasConversion<int>();
        builder.Property(o => o.PaymentMethodKind).HasConversion<int>();

        // ---- Snapshots of payment method display fields. ----------------------
        builder.Property(o => o.PaymentMethodNameEn).HasMaxLength(64).IsRequired();
        builder.Property(o => o.PaymentMethodNameAr).HasMaxLength(64).IsRequired();

        // ---- Free-text fields. ------------------------------------------------
        builder.Property(o => o.BuyerNote).HasMaxLength(1000);
        builder.Property(o => o.CancellationReason).HasMaxLength(500);

        // ---- Timestamps. ------------------------------------------------------
        builder.Property(o => o.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(o => o.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // ---- ShippingAddress is an OWNED value object (inline columns). -------
        // Each property gets a Ship* column prefix so audit queries are readable.
        builder.OwnsOne(o => o.ShippingAddress, sa =>
        {
            sa.Property(p => p.RecipientName).HasColumnName("ShipRecipientName").HasMaxLength(100).IsRequired();
            sa.Property(p => p.Phone).HasColumnName("ShipPhone").HasMaxLength(32).IsRequired();
            sa.Property(p => p.Governorate).HasColumnName("ShipGovernorate").HasMaxLength(100).IsRequired();
            sa.Property(p => p.City).HasColumnName("ShipCity").HasMaxLength(100).IsRequired();
            sa.Property(p => p.StreetAddress).HasColumnName("ShipStreetAddress").HasMaxLength(200).IsRequired();
            sa.Property(p => p.Floor).HasColumnName("ShipFloor").HasMaxLength(50);
            sa.Property(p => p.Apartment).HasColumnName("ShipApartment").HasMaxLength(50);
            sa.Property(p => p.Landmark).HasColumnName("ShipLandmark").HasMaxLength(200);
            sa.Property(p => p.Notes).HasColumnName("ShipNotes").HasMaxLength(500);
        });

        // ---- Relationships. ---------------------------------------------------
        // BuyerUser — restrict delete; we never want to lose order history when
        // a user is removed. (Soft-delete-the-user is the right path; M-later.)
        builder.HasOne(o => o.BuyerUser)
            .WithMany()
            .HasForeignKey(o => o.BuyerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // PaymentMethod — also restricted; methods can be deactivated but not
        // deleted while order history references them.
        builder.HasOne(o => o.PaymentMethod)
            .WithMany()
            .HasForeignKey(o => o.PaymentMethodId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(o => o.BuyerUserId);
        builder.HasIndex(o => o.Status);
        builder.HasIndex(o => o.CreatedAt);
    }
}
