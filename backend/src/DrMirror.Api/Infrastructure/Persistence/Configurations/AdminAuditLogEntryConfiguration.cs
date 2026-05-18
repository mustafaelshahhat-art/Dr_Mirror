using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

internal sealed class AdminAuditLogEntryConfiguration : IEntityTypeConfiguration<AdminAuditLogEntry>
{
    public void Configure(EntityTypeBuilder<AdminAuditLogEntry> builder)
    {
        builder.ToTable("AdminAuditLogEntries");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ActionType).HasMaxLength(64).IsRequired();
        builder.Property(e => e.TargetEntityType).HasMaxLength(64).IsRequired();
        builder.Property(e => e.TargetEntityId).HasMaxLength(64).IsRequired();
        builder.Property(e => e.PreviousStatus).HasMaxLength(64);
        builder.Property(e => e.NewStatus).HasMaxLength(64);
        builder.Property(e => e.CorrelationId).HasMaxLength(64);
        builder.Property(e => e.TimestampUtc).HasPrecision(7).IsRequired();

        builder.HasOne(e => e.ActorUser)
            .WithMany()
            .HasForeignKey(e => e.ActorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => e.TimestampUtc).HasDatabaseName("IX_AdminAudit_TimestampUtc").IsDescending();
        builder.HasIndex(e => new { e.TargetEntityType, e.TargetEntityId, e.TimestampUtc })
            .HasDatabaseName("IX_AdminAudit_Target")
            .IsDescending(false, false, true);
        builder.HasIndex(e => new { e.ActorUserId, e.TimestampUtc })
            .HasDatabaseName("IX_AdminAudit_Actor")
            .IsDescending(false, true);
    }
}
