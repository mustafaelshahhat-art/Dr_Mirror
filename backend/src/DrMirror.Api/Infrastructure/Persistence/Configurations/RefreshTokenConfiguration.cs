using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");

        builder.HasKey(rt => rt.Id);

        builder.Property(rt => rt.TokenHash)
            .HasMaxLength(64) // SHA-256 hex = 64 chars
            .IsRequired();

        builder.Property(rt => rt.ReplacedByTokenHash)
            .HasMaxLength(64);

        builder.Property(rt => rt.CreatedByIp).HasMaxLength(64);
        builder.Property(rt => rt.RevokedByIp).HasMaxLength(64);

        // The lookup path is always (TokenHash) → row. Unique index so we can
        // detect (and reject) attempted reuse of a rotated/revoked token in O(1).
        builder.HasIndex(rt => rt.TokenHash).IsUnique();

        // List-by-user, used for cleanup and "log out everywhere".
        builder.HasIndex(rt => rt.UserId);
    }
}
