using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security;

internal static class SecurityTestHelpers
{
    public static async Task<User> CreateUserAsync(
        this IntegrationWebAppFactory factory,
        string email,
        string role = UserRoles.Buyer)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        if (!await roleManager.RoleExistsAsync(role))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(role));
            Assert.True(roleResult.Succeeded, string.Join("; ", roleResult.Errors.Select(e => e.Description)));
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            FullName = email,
            EmailConfirmed = true,
            PhoneNumber = "01000000000",
            PhoneNumberConfirmed = true,
            PhoneVerifiedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var createResult = await userManager.CreateAsync(user, "Password123!");
        Assert.True(createResult.Succeeded, string.Join("; ", createResult.Errors.Select(e => e.Description)));

        var roleResult2 = await userManager.AddToRoleAsync(user, role);
        Assert.True(roleResult2.Succeeded, string.Join("; ", roleResult2.Errors.Select(e => e.Description)));

        return user;
    }

    public static async Task<string> IssueAccessTokenAsync(
        this IntegrationWebAppFactory factory,
        Guid userId,
        params string[] roles)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var user = await userManager.FindByIdAsync(userId.ToString());
        Assert.NotNull(user);
        return jwt.CreateAccessToken(user!, roles).Token;
    }

    public static async Task<string> SeedOrderAsync(
        this IntegrationWebAppFactory factory,
        Guid buyerId,
        PaymentMethodKind kind = PaymentMethodKind.Instapay,
        OrderStatus status = OrderStatus.Pending)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var paymentMethod = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            NameEn = $"Test {kind}",
            NameAr = $"Test {kind}",
            Kind = kind,
            IsActive = true,
        };
        db.PaymentMethods.Add(paymentMethod);

        var orderNumber = $"DM-SEC-{Guid.NewGuid():N}"[..20];
        db.Orders.Add(new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            BuyerUserId = buyerId,
            Status = status,
            SubTotal = 100,
            ShippingFee = 0,
            Total = 100,
            Currency = "EGP",
            PaymentMethodId = paymentMethod.Id,
            PaymentMethodKind = kind,
            PaymentMethodNameEn = paymentMethod.NameEn,
            PaymentMethodNameAr = paymentMethod.NameAr,
            ShippingAddress = new ShippingAddress
            {
                RecipientName = "Test Buyer",
                Phone = "01000000000",
                Governorate = "cairo",
                City = "Maadi",
                StreetAddress = "123 Street",
            },
        });

        await db.SaveChangesAsync();
        return orderNumber;
    }

    public static async Task<(string OrderNumber, Guid ProofId)> SeedOrderWithProofAsync(
        this IntegrationWebAppFactory factory,
        Guid buyerId,
        string fileKey,
        string contentType = "image/jpeg")
    {
        var orderNumber = await factory.SeedOrderAsync(
            buyerId,
            PaymentMethodKind.Instapay,
            OrderStatus.PendingPaymentReview);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var order = db.Orders.Single(o => o.OrderNumber == orderNumber);
        var proofId = Guid.NewGuid();

        db.PaymentProofs.Add(new PaymentProof
        {
            Id = proofId,
            OrderId = order.Id,
            FileUrl = $"/uploads/{fileKey}",
            FileKey = fileKey,
            ContentType = contentType,
            SizeBytes = 6,
            Status = PaymentProofStatus.Pending,
            UploadedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        return (orderNumber, proofId);
    }

    public static async Task AddRefreshTokenAsync(
        this IntegrationWebAppFactory factory,
        Guid userId,
        string rawToken,
        bool revoked = false)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = jwt.HashRefreshToken(rawToken),
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            RevokedAt = revoked ? DateTimeOffset.UtcNow.AddMinutes(-1) : null,
        });
        await db.SaveChangesAsync();
    }
}
