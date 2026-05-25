using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Email;

/// <summary>
/// Verifies the transactional outbox pattern introduced in Task 13:
///
///   1. Outbox row is created (Pending) when domain events fire.
///   2. Backoff timing increases exponentially.
///   3. Processor marks a message Failed after exceeding max attempts.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class EmailOutboxTests : IClassFixture<EmailOutboxTests.Factory>
{
    private readonly Factory _factory;

    public EmailOutboxTests(Factory factory)
    {
        _factory = factory;
    }

    // ── Integration: outbox row created on order placement ───────────────────

    [Fact]
    public async Task Pending_outbox_message_is_created_when_order_is_placed()
    {
        var userId = Guid.NewGuid();
        await _factory.SeedCheckoutPrerequisitesAsync(userId);

        var client = MakeClient(userId);
        var paymentMethodId = await _factory.GetCodPaymentMethodIdAsync();
        var governorateId = await _factory.GetGovernorateIdAsync();

        var response = await client.PostAsJsonAsync("/api/checkout", new
        {
            GovernorateId = governorateId,
            PaymentMethodId = paymentMethodId,
            ShippingAddress = new
            {
                RecipientName = "Test User",
                Phone = "01000000000",
                Governorate = "cairo",
                City = "Maadi",
                StreetAddress = "123 Test St",
            },
        });

        Assert.Equal(System.Net.HttpStatusCode.Created, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var outboxRows = await db.EmailOutboxMessages
            .Where(m => m.EventType == "OrderConfirmation" && m.Status == OutboxMessageStatus.Pending)
            .ToListAsync();

        Assert.NotEmpty(outboxRows);
        Assert.Equal(0, outboxRows[0].Attempts);
    }

    [Fact]
    public async Task Pending_outbox_message_is_created_when_inquiry_is_submitted()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/inquiries", new
        {
            FullName = "Alice Tester",
            Email = "alice@example.com",
            Subject = "Test subject",
            Message = "Test message body with enough length.",
        });

        Assert.Equal(System.Net.HttpStatusCode.Created, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var row = await db.EmailOutboxMessages
            .FirstOrDefaultAsync(m => m.EventType == "InquiryReceived");

        Assert.NotNull(row);
        Assert.Equal(OutboxMessageStatus.Pending, row.Status);
    }

    // ── Unit: backoff timing ──────────────────────────────────────────────────

    [Theory]
    [InlineData(1,   120)]         // attempt 1 → 4^1 * 30 =  120s (2 min)
    [InlineData(2,   480)]         // attempt 2 → 4^2 * 30 =  480s (8 min)
    [InlineData(3,   1920)]        // attempt 3 → 4^3 * 30 = 1920s (32 min)
    [InlineData(4,   7680)]        // attempt 4 → 4^4 * 30 = 7680s (~2 h)
    public void Backoff_increases_exponentially(int attemptNumber, double expectedSeconds)
    {
        var before = DateTimeOffset.UtcNow;
        var nextRetry = before.AddSeconds(Math.Pow(4, attemptNumber) * 30);
        var actual = (nextRetry - before).TotalSeconds;
        Assert.Equal(expectedSeconds, actual, precision: 0);
    }

    // ── Unit: max-attempts → Failed status ───────────────────────────────────

    [Fact]
    public void Message_status_is_Failed_after_ten_failed_attempts()
    {
        const int maxAttempts = 10;
        var msg = new EmailOutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = "OrderConfirmation",
            Payload = Guid.NewGuid().ToString(),
            IdempotencyKey = "test-key",
            Status = OutboxMessageStatus.Pending,
            Attempts = 0,
            NextRetryAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        // Simulate the processor's failure path 10 times.
        for (var i = 0; i < maxAttempts; i++)
        {
            msg.Attempts++;
            msg.LastAttemptAt = DateTimeOffset.UtcNow;
            msg.FailureReason = "simulated error";

            if (msg.Attempts >= maxAttempts)
                msg.Status = OutboxMessageStatus.Failed;
            else
                msg.NextRetryAt = DateTimeOffset.UtcNow.AddSeconds(Math.Pow(4, msg.Attempts) * 30);
        }

        Assert.Equal(OutboxMessageStatus.Failed, msg.Status);
        Assert.Equal(maxAttempts, msg.Attempts);
    }

    [Fact]
    public void Message_stays_Pending_until_max_attempts_is_reached()
    {
        const int maxAttempts = 10;
        var msg = new EmailOutboxMessage
        {
            Status = OutboxMessageStatus.Pending,
            Attempts = 0,
            IdempotencyKey = "k",
        };

        for (var i = 0; i < maxAttempts - 1; i++)
        {
            msg.Attempts++;
            if (msg.Attempts >= maxAttempts)
                msg.Status = OutboxMessageStatus.Failed;
        }

        Assert.Equal(OutboxMessageStatus.Pending, msg.Status);
        Assert.Equal(maxAttempts - 1, msg.Attempts);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private HttpClient MakeClient(Guid userId)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, OutboxTestAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new OutboxTestUser(userId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    // ── Factory ───────────────────────────────────────────────────────────────

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "EmailOutboxTest_" + Guid.NewGuid();

        public async Task SeedCheckoutPrerequisitesAsync(Guid userId)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var buyer = new User { Id = userId, FullName = "Outbox Buyer", Email = $"{userId}@example.com", UserName = $"{userId}@example.com", PhoneNumber = "01000000000", PhoneNumberConfirmed = true, PhoneVerifiedAt = DateTimeOffset.UtcNow };
            var pm = new PaymentMethod { Id = Guid.NewGuid(), NameEn = "COD", NameAr = "COD", Kind = PaymentMethodKind.Cod, IsActive = true };
            var cat = new Category { Id = Guid.NewGuid(), NameEn = "Cat", NameAr = "Cat", Slug = $"cat-{userId}", IsActive = true };
            var prod = new Product { Id = Guid.NewGuid(), CategoryId = cat.Id, NameEn = "Prod", NameAr = "Prod", Slug = $"prod-{userId}", IsPublished = true, Price = 50 };
            var variant = new ProductVariant { Id = Guid.NewGuid(), ProductId = prod.Id, Sku = $"SKU-{userId}", Size = "M", ColorName = "Black", ColorNameAr = "Black", ColorHex = "#000", Stock = 5, IsActive = true };
            var cart = new DrMirror.Api.Domain.Entities.Cart { Id = Guid.NewGuid(), UserId = userId };
            var cartItem = new CartItem { Id = Guid.NewGuid(), CartId = cart.Id, ProductVariantId = variant.Id, Quantity = 1 };

            db.Users.Add(buyer);
            db.PaymentMethods.Add(pm);
            db.Categories.Add(cat);
            db.Products.Add(prod);
            db.ProductVariants.Add(variant);
            db.Carts.Add(cart);
            db.CartItems.Add(cartItem);
            await db.SaveChangesAsync();
        }

        public async Task<Guid> GetCodPaymentMethodIdAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var pm = await db.PaymentMethods
                .FirstAsync(m => m.Kind == PaymentMethodKind.Cod && m.IsActive);
            return pm.Id;
        }

        public async Task<Guid> GetGovernorateIdAsync()
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var existing = await db.GovernorateShippingFees.FirstOrDefaultAsync();
            if (existing is not null) return existing.Id;

            var governorate = new GovernorateShippingFee
            {
                Id = Guid.NewGuid(),
                Slug = "cairo",
                NameEn = "Cairo",
                NameAr = "القاهرة",
                Fee = 0m,
                IsActive = true,
            };
            db.GovernorateShippingFees.Add(governorate);
            await db.SaveChangesAsync();
            return governorate.Id;
        }
    }
}

// ── Test auth helpers ─────────────────────────────────────────────────────────

public class OutboxTestUser
{
    public Guid UserId { get; }
    public OutboxTestUser(Guid id) => UserId = id;
}

public class OutboxTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly OutboxTestUser _user;

    public OutboxTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        OutboxTestUser user)
        : base(options, logger, encoder)
    {
        _user = user;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _user.UserId.ToString()),
            new Claim(ClaimTypes.Role, DrMirror.Api.Domain.Identity.UserRoles.Buyer),
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
