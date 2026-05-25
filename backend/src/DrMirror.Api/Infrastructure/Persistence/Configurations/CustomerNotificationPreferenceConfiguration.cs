using DrMirror.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrMirror.Api.Infrastructure.Persistence.Configurations;

public sealed class CustomerNotificationPreferenceConfiguration : IEntityTypeConfiguration<CustomerNotificationPreference>
{
    public void Configure(EntityTypeBuilder<CustomerNotificationPreference> builder)
    {
        builder.ToTable("CustomerNotificationPreferences");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.WhatsAppEnabled).HasDefaultValue(true);
        builder.Property(x => x.UpdatedAt).IsRequired();

        builder.HasIndex(x => x.UserId)
            .IsUnique()
            .HasDatabaseName("UX_CustomerNotificationPreferences_UserId");

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
