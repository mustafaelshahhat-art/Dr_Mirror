using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

public sealed class WhatsAppOutboxMessageConfiguration : IEntityTypeConfiguration<WhatsAppOutboxMessage>
{
    public void Configure(EntityTypeBuilder<WhatsAppOutboxMessage> builder)
    {
        builder.ToTable("WhatsAppOutboxMessages");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Payload).IsRequired();
        builder.Property(x => x.RecipientPhoneMasked).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Status).HasDefaultValue(WhatsAppOutboxStatus.Pending);
        builder.Property(x => x.Attempts).HasDefaultValue(0);
        builder.Property(x => x.NextRetryAt).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.LockedBy).HasMaxLength(100);
        builder.Property(x => x.IdempotencyKey).HasMaxLength(200).IsRequired();
        builder.Property(x => x.EntityType).HasMaxLength(32).IsRequired(false);
        builder.Property(x => x.EntityId).IsRequired(false);
        builder.Property(x => x.ParentMessageId).IsRequired(false);

        builder.HasIndex(x => x.IdempotencyKey)
            .IsUnique()
            .HasDatabaseName("UX_WhatsAppOutboxMessages_IdempotencyKey");
        builder.HasIndex(x => new { x.Status, x.NextRetryAt })
            .HasFilter("[Status] = 0")
            .HasDatabaseName("IX_WhatsAppOutboxMessages_Status_NextRetryAt");
        builder.HasIndex(x => new { x.Status, x.LockedAt })
            .HasFilter("[Status] = 1")
            .HasDatabaseName("IX_WhatsAppOutboxMessages_Status_LockedAt");
        builder.HasIndex(x => new { x.RecipientPhoneMasked, x.CreatedAt })
            .HasDatabaseName("IX_WhatsAppOutboxMessages_RecipientPhoneMasked_CreatedAt");
        builder.HasIndex(x => x.ParentMessageId)
            .HasDatabaseName("IX_WhatsAppOutboxMessages_ParentMessageId");
    }
}
