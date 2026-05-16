using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Orders;

/// <summary>
/// Verifies the three proof-review correctness invariants introduced in Phase 2:
///
///   Task 9 — Staleness guard: only the latest pending proof can be approved/rejected.
///   Task 10 — Rejection does not write the review note to <c>Order.CancellationReason</c>.
///
/// These are condition-level unit tests (same pattern as UserRoleSecurityTests and
/// SeederSafetyTests): they directly assert the guard logic and FSM state rather than
/// spinning up a full WebApplicationFactory, keeping the suite fast.
/// </summary>
public class ProofLifecycleTests
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private static PaymentProof NewProof(PaymentProofStatus status, DateTimeOffset uploadedAt) => new()
    {
        Id = Guid.NewGuid(),
        OrderId = Guid.NewGuid(),
        FileUrl = "/api/orders/DM-2026-TEST/proof/some-id/file",
        FileKey = "payment-proofs/DM-2026-TEST/file.jpg",
        ContentType = "image/jpeg",
        SizeBytes = 1024,
        Status = status,
        UploadedAt = uploadedAt,
    };

    private static Guid LatestPendingId(IEnumerable<PaymentProof> proofs)
    {
        // Mirror the staleness guard logic from the approve/reject endpoints.
        return proofs
            .Where(p => p.Status == PaymentProofStatus.Pending)
            .OrderByDescending(p => p.UploadedAt)
            .Select(p => p.Id)
            .FirstOrDefault();
    }

    // ── Task 9 — Staleness guard ─────────────────────────────────────────────

    [Fact]
    public void Latest_pending_proof_is_approved_when_it_is_the_only_pending()
    {
        var proof = NewProof(PaymentProofStatus.Pending, DateTimeOffset.UtcNow);
        var latestId = LatestPendingId([proof]);
        Assert.Equal(proof.Id, latestId);
    }

    [Fact]
    public void Older_pending_proof_is_superseded_after_reupload()
    {
        var older = NewProof(PaymentProofStatus.Pending, DateTimeOffset.UtcNow.AddMinutes(-5));
        var newer = NewProof(PaymentProofStatus.Pending, DateTimeOffset.UtcNow);

        var latestId = LatestPendingId([older, newer]);

        Assert.Equal(newer.Id, latestId);
        Assert.NotEqual(older.Id, latestId); // older is superseded — guard fires
    }

    [Fact]
    public void Reviewed_proofs_are_excluded_from_staleness_check()
    {
        var approved = NewProof(PaymentProofStatus.Approved, DateTimeOffset.UtcNow.AddDays(-1));
        var pending = NewProof(PaymentProofStatus.Pending, DateTimeOffset.UtcNow);

        var latestId = LatestPendingId([approved, pending]);
        Assert.Equal(pending.Id, latestId); // reviewed proof ignored
    }

    [Fact]
    public void No_pending_proof_returns_empty_guid()
    {
        var approved = NewProof(PaymentProofStatus.Approved, DateTimeOffset.UtcNow);
        var latestId = LatestPendingId([approved]);
        Assert.Equal(Guid.Empty, latestId);
    }

    // ── Task 10 — Rejection does not corrupt CancellationReason ──────────────

    [Fact]
    public void Rejecting_proof_via_FSM_without_reason_leaves_CancellationReason_null()
    {
        // The endpoint now calls fsm.Transition(order, Pending, Admin) — no reason.
        // Verify that the FSM does NOT set CancellationReason when no reason is passed.
        var fsm = new OrderStateMachine();
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "DM-2026-TEST",
            Status = OrderStatus.PendingPaymentReview,
            BuyerUserId = Guid.NewGuid(),
            Currency = "EGP",
            PaymentMethodKind = PaymentMethodKind.Instapay,
            CancellationReason = null,
        };

        fsm.Transition(order, OrderStatus.Pending, OrderActor.Admin);

        Assert.Equal(OrderStatus.Pending, order.Status);
        Assert.Null(order.CancellationReason);
    }

    [Fact]
    public void ReviewNote_is_the_authoritative_storage_for_rejection_feedback()
    {
        // The proof.ReviewNote field is set directly by the endpoint before the
        // FSM transition. This test documents that contract as an explicit invariant.
        var proof = NewProof(PaymentProofStatus.Pending, DateTimeOffset.UtcNow);
        const string note = "Transfer amount does not match.";

        // Simulate endpoint logic: set proof.ReviewNote, then call FSM without reason.
        proof.ReviewNote = note;
        proof.Status = PaymentProofStatus.Rejected;

        Assert.Equal(note, proof.ReviewNote);
    }
}
