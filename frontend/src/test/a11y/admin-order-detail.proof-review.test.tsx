import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminOrderDetailPage } from '../../features/admin/AdminOrderDetailPage';
import { ORDER_STATUSES, PAYMENT_METHOD_KIND, PAYMENT_PROOF_STATUS, type OrderDetailDto } from '../../features/orders/types';
import { makeAdminUser, makeAuthValue, renderWithProviders } from '../utils';
import testI18n from '../testI18n';
import { axe } from '../axe';

const order: OrderDetailDto = {
  id: 'o1', orderNumber: 'DM-1', status: ORDER_STATUSES.PendingPaymentReview, subTotal: 100, shippingFee: 0, total: 100, currency: 'EGP',
  shippingAddress: { recipientName: 'Ahmed', phone: '01000000000', governorate: 'cairo', city: 'Cairo', streetAddress: 'Street', floor: null, apartment: null, landmark: null, notes: null },
  paymentMethodId: 'pm1', paymentMethodKind: PAYMENT_METHOD_KIND.Instapay, paymentMethodNameEn: 'Instapay', paymentMethodNameAr: 'إنستاباي', paymentInstructionsEn: 'Send', paymentInstructionsAr: 'أرسل', paymentAccountNumber: '01000000000', paymentAccountHolder: 'Dr. Mirror',
  buyerNote: null, cancellationReason: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', confirmedAt: null, paidAt: null, preparingAt: null, shippedAt: null, deliveredAt: null, cancelledAt: null, pendingPaymentReviewAt: '2026-01-01T00:00:00Z', paymentStatusLabel: 'underReview',
  allowedNextStatesForBuyer: [], allowedNextStatesForAdmin: [ORDER_STATUSES.Paid], items: [{ id: 'i1', productId: 'p1', productSlug: 'scrub', productVariantId: 'v1', nameAr: 'سكرب', nameEn: 'Scrub', sku: 'SKU-1', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080', primaryImageUrl: null, unitPrice: 100, quantity: 1, lineTotal: 100 }],
  paymentProofs: [{ id: 'proof-1', fileUrl: '/proof.jpg', originalFileName: 'proof.jpg', contentType: 'image/jpeg', sizeBytes: 1000, status: PAYMENT_PROOF_STATUS.Pending, uploadedAt: '2026-01-01T00:00:00Z', reviewedByUserId: null, reviewedAt: null, reviewedByUserName: null, reviewNote: null }], buyer: { id: 'b1', fullName: 'Ahmed', email: 'a@example.com' },
};

vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useParams: () => ({ orderNumber: 'DM-1' }) }));
vi.mock('../../features/admin/hooks', async () => ({ ...(await vi.importActual('../../features/admin/hooks')), useAdminOrderQuery: () => ({ data: order, isLoading: false, isError: false, refetch: vi.fn(), error: null }) }));

beforeEach(async () => {
  await testI18n.changeLanguage('ar');
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
});

describe('a11y admin order detail proof review', () => {
  it('has no axe violations in Arabic RTL', async () => {
    const { container, findByText } = renderWithProviders(<AdminOrderDetailPage />, {
      authValue: makeAuthValue({ user: makeAdminUser(), isAuthenticated: true, isAdmin: true }),
    });
    await findByText('DM-1');

    expect(await axe(container)).toHaveNoViolations();
  });
});
