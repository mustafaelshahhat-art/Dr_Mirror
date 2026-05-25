using DrMirror.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.Persistence;

/// <summary>
/// The single <see cref="DbContext"/> for the application.
///
/// Identity tables come for free from <see cref="IdentityDbContext{TUser, TRole, TKey}"/>.
/// Aggregates added per milestone are exposed as <see cref="DbSet{TEntity}"/>
/// properties and shaped by <c>IEntityTypeConfiguration&lt;T&gt;</c> classes
/// living next to this file — never inline <c>OnModelCreating</c> code.
/// </summary>
public class AppDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();

    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();

    public DbSet<BuyerAddress> BuyerAddresses => Set<BuyerAddress>();

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<OrderCounter> OrderCounters => Set<OrderCounter>();
    public DbSet<PaymentProof> PaymentProofs => Set<PaymentProof>();
    public DbSet<Inquiry> Inquiries => Set<Inquiry>();
    public DbSet<EmailOutboxMessage> EmailOutboxMessages => Set<EmailOutboxMessage>();
    public DbSet<AdminAuditLogEntry> AdminAuditLogEntries => Set<AdminAuditLogEntry>();
    public DbSet<OrderIdempotencyKey> OrderIdempotencyKeys => Set<OrderIdempotencyKey>();
    public DbSet<GovernorateShippingFee> GovernorateShippingFees => Set<GovernorateShippingFee>();
    public DbSet<ReturnRequest> ReturnRequests => Set<ReturnRequest>();
    public DbSet<ReturnRequestItem> ReturnRequestItems => Set<ReturnRequestItem>();
    public DbSet<PasswordResetRequest> PasswordResetRequests => Set<PasswordResetRequest>();
    public DbSet<WhatsAppOutboxMessage> WhatsAppOutboxMessages => Set<WhatsAppOutboxMessage>();
    public DbSet<CustomerNotificationPreference> CustomerNotificationPreferences => Set<CustomerNotificationPreference>();
    public DbSet<PhoneVerificationOtp> PhoneVerificationOtps => Set<PhoneVerificationOtp>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Auto-discover every IEntityTypeConfiguration<T> in this assembly so
        // new aggregates only need to drop a configuration file next to this one.
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Trim Identity table names slightly — keep them prefixed but without
        // the redundant "AspNet" cruft.
        RenameIdentityTables(builder);
    }

    private static void RenameIdentityTables(ModelBuilder builder)
    {
        builder.Entity<User>().ToTable("Users");
        builder.Entity<IdentityRole<Guid>>().ToTable("Roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
    }
}
