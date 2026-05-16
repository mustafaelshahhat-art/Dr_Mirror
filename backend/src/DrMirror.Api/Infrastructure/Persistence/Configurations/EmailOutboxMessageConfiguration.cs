using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class EmailOutboxMessageConfiguration : IEntityTypeConfiguration<EmailOutboxMessage>
{
    public void Configure(EntityTypeBuilder<EmailOutboxMessage> builder)
    {
        builder.ToTable("EmailOutboxMessages");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.EventType).HasMaxLength(100).IsRequired();
        builder.Property(m => m.Payload).HasMaxLength(-1).IsRequired();
        builder.Property(m => m.Status).HasConversion<int>();
        builder.Property(m => m.LockedBy).HasMaxLength(100);
        builder.Property(m => m.FailureReason).HasMaxLength(-1);

        builder.Property(m => m.IdempotencyKey).HasMaxLength(200).IsRequired();
        builder.HasIndex(m => m.IdempotencyKey).IsUnique();

        // Filtered index for the poller: only look at pending rows due for retry.
        builder.HasIndex(m => new { m.Status, m.NextRetryAt })
            .HasFilter("[Status] = 0");

        builder.HasIndex(m => new { m.Status, m.LockedAt })
            .HasFilter("[Status] = 3");
    }
}
