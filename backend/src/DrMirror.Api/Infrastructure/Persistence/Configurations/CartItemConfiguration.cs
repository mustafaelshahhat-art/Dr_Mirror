using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class CartItemConfiguration : IEntityTypeConfiguration<CartItem>
{
    public void Configure(EntityTypeBuilder<CartItem> builder)
    {
        builder.ToTable("CartItems");

        builder.HasKey(i => i.Id);

        // Money — never floating point.
        builder.Property(i => i.UnitPriceSnapshot).HasColumnType("decimal(18,2)");

        builder.Property(i => i.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(i => i.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // (CartId, ProductVariantId) unique → adding the same variant twice
        // becomes an UPDATE that increments quantity, never a duplicate row.
        builder.HasIndex(i => new { i.CartId, i.ProductVariantId }).IsUnique();

        // Lines are owned by the cart — delete cascades.
        builder.HasOne(i => i.Cart)
            .WithMany(c => c.Items)
            .HasForeignKey(i => i.CartId)
            .OnDelete(DeleteBehavior.Cascade);

        // Don't allow deleting a variant that's still referenced by a cart.
        // Admin can disable a variant (IsActive=false) instead — it'll surface
        // as "no longer available" in the cart UI without breaking the FK.
        builder.HasOne(i => i.ProductVariant)
            .WithMany()
            .HasForeignKey(i => i.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
