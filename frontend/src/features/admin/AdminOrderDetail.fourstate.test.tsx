import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import testI18n from '../../test/testI18n';
import { AdminOrderDetailPage } from './AdminOrderDetailPage';
import type { OrderDetailDto } from '../orders/types';
import { ORDER_STATUSES, PAYMENT_METHOD_KIND } from '../orders/types';

const MOCK_ORDER_NUMBER = 'DM-2026-0001';
const MOCK_ORDER: OrderDetailDto = {
  id: 'order-1',
  orderNumber: MOCK_ORDER_NUMBER,
  status: ORDER_STATUSES.PendingPaymentReview,
  subTotal: 1198,
  shippingFee: 0,
  total: 1198,
  currency: 'EGP',
  shippingAddress: {
    recipientName: 'Ahmed Ali',
    phone: '+201001234567',
    governorate: 'cairo',
    city: 'Nasr City',
    streetAddress: '15 Abbas El-Akkad',
    floor: '4',
    apartment: '12',
    landmark: 'Next to City Stars',
    notes: 'Ring the bell twice',
  },
  paymentMethodId: 'pm-1',
  paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
  paymentMethodNameEn: 'Instapay',
  paymentMethodNameAr: 'إنستاباي',
  paymentInstructionsEn: 'Send to @clinic',
  paymentInstructionsAr: 'أرسل إلى @clinic',
  paymentAccountNumber: '01000000000',
  paymentAccountHolder: 'Dr.Mirror',
  buyerNote: 'Please deliver after 5 PM',
  cancellationReason: null,
  createdAt: '2026-01-15T10:30:00Z',
  updatedAt: '2026-01-15T10:30:00Z',
  confirmedAt: null,
  paidAt: null,
  preparingAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  pendingPaymentReviewAt: null,
  paymentStatusLabel: 'underReview',
  allowedNextStatesForBuyer: [],
  allowedNextStatesForAdmin: [ORDER_STATUSES.Confirmed, ORDER_STATUSES.Paid],
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      productSlug: 'medical-scrubs',
      productVariantId: 'var-1',
      nameAr: 'سكرب طبي',
      nameEn: 'Medical Scrubs',
      sku: 'SCR-001-M-NAV',
      size: 'M',
      colorName: 'Navy',
      colorNameAr: 'كحلي',
      colorHex: '#000080',
      primaryImageUrl: '/images/scrub-1.jpg',
      unitPrice: 599,
      quantity: 2,
      lineTotal: 1198,
    },
  ],
  paymentProofs: [],
  buyer: {
    id: 'buyer-1',
    fullName: 'Ahmed Ali',
    email: 'ahmed@example.com',
  },
};

const mockUseParams = vi.fn();
const mockUseAdminOrderQuery = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

vi.mock(import('./hooks'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAdminOrderQuery: (...args: unknown[]) => mockUseAdminOrderQuery(...args),
  };
});

beforeEach(() => {
  mockUseParams.mockReturnValue({ orderNumber: MOCK_ORDER_NUMBER });
  mockUseAdminOrderQuery.mockReturnValue({
    data: MOCK_ORDER,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    error: null,
  });
});

afterEach(() => {
  document.documentElement.classList.remove('dark', 'light');
});

describe.each([
  { theme: 'dark', lang: 'ar', label: 'dark/ar (RTL)' },
  { theme: 'dark', lang: 'en', label: 'dark/en (LTR)' },
  { theme: 'light', lang: 'ar', label: 'light/ar (RTL)' },
  { theme: 'light', lang: 'en', label: 'light/en (LTR)' },
])('AdminOrderDetailPage — $label', ({ theme, lang }) => {
  function renderInState() {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }

  it('renders order number and buyer info', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<AdminOrderDetailPage />);

    expect(screen.getByText(MOCK_ORDER_NUMBER)).toBeInTheDocument();
    const nameElements = screen.getAllByText(MOCK_ORDER.buyer.fullName);
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(MOCK_ORDER.buyer.email)).toBeInTheDocument();
  });

  it('renders order status badge', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<AdminOrderDetailPage />);

    const statusText =
      lang === 'ar' ? 'مراجعة الدفع' : 'Payment under review';
    const matches = screen.getAllByText(statusText);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders order item details with image alt text', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<AdminOrderDetailPage />);

    const expectedName = lang === 'ar' ? 'سكرب طبي' : 'Medical Scrubs';
    expect(screen.getByText(expectedName)).toBeInTheDocument();

    const itemImage = screen.getByRole('img', { name: expectedName });
    expect(itemImage).toBeInTheDocument();
    expect(itemImage).toHaveAttribute('alt', expectedName);
    expect(itemImage).toHaveAttribute('loading', 'lazy');
  });

  it('renders shipping address', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<AdminOrderDetailPage />);

    const nameElements = screen.getAllByText(MOCK_ORDER.shippingAddress.recipientName);
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(MOCK_ORDER.shippingAddress.phone)).toBeInTheDocument();
  });

  it('renders back link with correct arrow rotation', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<AdminOrderDetailPage />);

    const backLinkText = lang === 'ar' ? 'العودة إلى كل الطلبات' : 'Back to all orders';
    const backLink = screen.getByRole('link', { name: backLinkText });
    expect(backLink).toBeInTheDocument();

    const arrow = backLink.querySelector('.lucide-arrow-left');
    expect(arrow).toBeInTheDocument();

    expect(arrow).toHaveClass('rtl:rotate-180');
  });

  it('renders payment method name', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<AdminOrderDetailPage />);

    const expectedPaymentName = lang === 'ar' ? 'إنستاباي' : 'Instapay';
    expect(screen.getByText(expectedPaymentName)).toBeInTheDocument();
  });

  it('renders buyer note', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<AdminOrderDetailPage />);

    expect(screen.getByText(/Please deliver after 5 PM/)).toBeInTheDocument();
  });
});

describe('AdminOrderDetailPage — loading state', () => {
  it('renders skeleton while loading', async () => {
    mockUseAdminOrderQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    await testI18n.changeLanguage('en');
    renderWithProviders(<AdminOrderDetailPage />);

    expect(screen.getByLabelText('Loading order...')).toBeInTheDocument();
  });
});

describe('AdminOrderDetailPage — error state', () => {
  it('renders error state on query error', async () => {
    mockUseAdminOrderQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 500 } },
      refetch: vi.fn(),
    });

    await testI18n.changeLanguage('en');
    renderWithProviders(<AdminOrderDetailPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders not-found state for 404', async () => {
    mockUseAdminOrderQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 404 } },
      refetch: vi.fn(),
    });

    await testI18n.changeLanguage('en');
    renderWithProviders(<AdminOrderDetailPage />);

    expect(screen.getByText('Order not found')).toBeInTheDocument();
  });
});
