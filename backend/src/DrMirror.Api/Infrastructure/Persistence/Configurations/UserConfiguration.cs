using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.FullName)
            .HasMaxLength(120)
            .IsRequired();

        builder.Property(u => u.CreatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(u => u.UpdatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(u => u.PhoneVerifiedAt)
            .IsRequired(false);

        builder.Property(u => u.IsDisabled)
            .HasDefaultValue(false);

        // Refresh tokens are owned by the user — cascade delete is appropriate;
        // wiping a user wipes their outstanding sessions.
        builder.HasMany(u => u.RefreshTokens)
            .WithOne(rt => rt.User!)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
