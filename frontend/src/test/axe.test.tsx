import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './utils';
import testI18n from './testI18n';
import { axe } from './axe';

import { ProductDetailPage } from '../features/catalog/ProductDetailPage';
import { AdminOrderDetailPage } from '../features/admin/AdminOrderDetailPage';
import { AdminProductEditPage } from '../features/admin/catalog/AdminProductEditPage';
import { ReviewStep } from '../features/checkout/components/ReviewStep';

import type { ProductDetailDto } from '../features/catalog/types';
import type { OrderDetailDto } from '../features/orders/types';
import { ORDER_STATUSES, PAYMENT_METHOD_KIND } from '../features/orders/types';
import type { AdminProductDetailDto } from '../features/admin/catalog/types';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_SLUG = 'test-scrubs';
const MOCK_PRODUCT: ProductDetailDto = {
  id: 'prod-1',
  nameAr: 'سكرب طبي',
  nameEn: 'Medical Scrubs',
  slug: MOCK_SLUG,
  descriptionAr: 'وصف المنتج بالعربية',
  descriptionEn: 'Product description in English',
  price: 599,
  gender: 0,
  material: 'Cotton',
  brand: 'MediWear',
  sku: 'SCR-001',
  createdAt: '2026-01-01T00:00:00Z',
  category: { id: 'cat-1', nameAr: 'سكرب', nameEn: 'Scrubs', slug: 'scrubs', displayOrder: 1 },
  images: [
    { id: 'img-1', url: '/images/scrub-1.jpg', alt: 'Front view', displayOrder: 1 },
    { id: 'img-2', url: '/images/scrub-2.jpg', alt: null, displayOrder: 2 },
  ],
  variants: [
    { id: 'var-1', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080', sku: 'SCR-001-M-NAV', stock: 10, isActive: true },
  ],
};

const MOCK_VARIANT_SELECTION = {
  variants: MOCK_PRODUCT.variants,
  colors: [
    { id: 'var-1', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080', sku: 'SCR-001-M-NAV', stock: 10, isActive: true },
  ],
  sizes: ['M'],
  selectedColor: 'Navy',
  selectedSize: 'M',
  selectedVariant: MOCK_PRODUCT.variants[0],
  setColor: vi.fn(),
  setSize: vi.fn(),
};

const MOCK_ORDER_NUMBER = 'DM-2026-0001';
const MOCK_ORDER: OrderDetailDto = {
  id: 'order-1', orderNumber: MOCK_ORDER_NUMBER,
  status: ORDER_STATUSES.PendingPaymentReview,
  subTotal: 1198, shippingFee: 0, total: 1198, currency: 'EGP',
  shippingAddress: {
    recipientName: 'Ahmed Ali', phone: '+201001234567', governorate: 'cairo',
    city: 'Nasr City', streetAddress: '15 Abbas El-Akkad', floor: '4', apartment: '12',
    landmark: 'Next to City Stars', notes: 'Ring the bell twice',
  },
  paymentMethodId: 'pm-1', paymentMethodKind: PAYMENT_METHOD_KIND.Instapay,
  paymentMethodNameEn: 'Instapay', paymentMethodNameAr: 'إنستاباي',
  paymentInstructionsEn: 'Send to @clinic', paymentInstructionsAr: 'أرسل إلى @clinic',
  paymentAccountNumber: '01000000000', paymentAccountHolder: 'Dr. Mirror',
  buyerNote: 'Please deliver after 5 PM', cancellationReason: null,
  createdAt: '2026-01-15T10:30:00Z', updatedAt: '2026-01-15T10:30:00Z',
  confirmedAt: null, paidAt: null, shippedAt: null, deliveredAt: null, cancelledAt: null, pendingPaymentReviewAt: null, paymentStatusLabel: 'underReview',
  allowedNextStatesForBuyer: [], allowedNextStatesForAdmin: [ORDER_STATUSES.Confirmed, ORDER_STATUSES.Paid],
  items: [{
    id: 'item-1', productId: 'prod-1', productSlug: 'medical-scrubs',
    productVariantId: 'var-1', nameAr: 'سكرب طبي', nameEn: 'Medical Scrubs',
    sku: 'SCR-001-M-NAV', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080',
    primaryImageUrl: '/images/scrub-1.jpg', unitPrice: 599, quantity: 2, lineTotal: 1198,
  }],
  paymentProofs: [],
  buyer: { id: 'buyer-1', fullName: 'Ahmed Ali', email: 'ahmed@example.com' },
};

const MOCK_ADMIN_PRODUCT: AdminProductDetailDto = {
  id: 'prod-1', nameAr: 'سكرب طبي', nameEn: 'Medical Scrubs', slug: MOCK_SLUG,
  descriptionAr: 'وصف المنتج بالعربية', descriptionEn: 'Product description in English',
  price: 599, gender: 0, material: 'Cotton', brand: 'MediWear', sku: 'SCR-001',
  isPublished: true, categoryId: 'cat-1', categoryNameEn: 'Scrubs', categoryNameAr: 'سكرب',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  variants: [
    { id: 'var-1', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080', sku: 'SCR-001-M-NAV', stock: 10, isActive: true, createdAt: '', updatedAt: '' },
  ],
  images: [
    { id: 'img-1', url: '/images/scrub-1.jpg', alt: 'Front view', displayOrder: 1, fileKey: null, contentType: null, sizeBytes: null, createdAt: '' },
    { id: 'img-2', url: '/images/scrub-2.jpg', alt: null, displayOrder: 2, fileKey: null, contentType: null, sizeBytes: null, createdAt: '' },
  ],
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ slug: MOCK_SLUG }) };
});

vi.mock('../features/catalog/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/catalog/hooks')>('../features/catalog/hooks');
  return {
    ...actual,
    useProductDetailQuery: () => ({ data: MOCK_PRODUCT, isLoading: false, isError: false, refetch: vi.fn(), error: null }),
    useLocalizedField: (entity: { nameAr: string; nameEn: string } | undefined) => entity?.nameEn ?? '',
    useLocalizedDescription: (entity: { descriptionAr: string; descriptionEn: string } | undefined) => entity?.descriptionEn ?? '',
    useVariantSelection: () => MOCK_VARIANT_SELECTION,
  };
});

vi.mock('../features/catalog/hooks/useAddToCart', () => ({
  useAddToCart: () => ({ addState: 'idle', addError: null, handleAddToCart: vi.fn() }),
}));

vi.mock('../features/cart/useCart', () => ({
  useCart: () => ({ cart: { items: [], subTotal: 0, totalQuantity: 0 }, addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), isCartLoading: false }),
}));

vi.mock('../features/admin/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/admin/hooks')>('../features/admin/hooks');
  return {
    ...actual,
    useAdminOrderQuery: () => ({ data: MOCK_ORDER, isLoading: false, isError: false, refetch: vi.fn(), error: null }),
  };
});

vi.mock('../features/admin/catalog/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/admin/catalog/hooks')>('../features/admin/catalog/hooks');
  return {
    ...actual,
    useAdminProductQuery: () => ({ data: MOCK_ADMIN_PRODUCT, isLoading: false, isError: false, refetch: vi.fn(), error: null }),
    useAdminCategoriesQuery: () => ({ data: [], isLoading: false, isError: false }),
    useUpdateProductMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useTogglePublishMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateVariantMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useToggleVariantActiveMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateVariantMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUploadImageMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateImageMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteImageMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('axe — WCAG 2.1 AA violations', () => {
  it('product detail page has no violations', async () => {
    await testI18n.changeLanguage('en');
    const { container } = renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText('Medical Scrubs')).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('checkout review step has no violations', async () => {
    await testI18n.changeLanguage('en');
    const { container } = renderWithProviders(
      <ReviewStep
        reviewAddress={{
          recipientName: 'Ahmed Ali',
          phone: '+201001234567',
          streetAddress: '15 Abbas El-Akkad',
          apartment: '12',
          floor: '4',
          city: 'Nasr City',
          governorate: 'cairo',
        }}
        selectedMethod={{
          id: 'pm-1',
          code: 'instapay',
          kind: PAYMENT_METHOD_KIND.Instapay,
          nameEn: 'Instapay',
          nameAr: 'إنستاباي',
          instructionsEn: 'Send to @clinic',
          instructionsAr: 'أرسل إلى @clinic',
          accountNumber: '01000000000',
          accountHolder: 'Dr. Mirror',
          displayOrder: 1,
        }}
        buyerNote="Please deliver after 5 PM"
        isAr={false}
      />,
    );
    expect(screen.getByText('Instapay')).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('admin order detail page has no violations', async () => {
    await testI18n.changeLanguage('en');
    const { container } = renderWithProviders(<AdminOrderDetailPage />);
    expect(screen.getByText(MOCK_ORDER_NUMBER)).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('admin product edit page has no violations', async () => {
    await testI18n.changeLanguage('en');
    const { container } = renderWithProviders(<AdminProductEditPage />);
    expect(screen.getByText('Medical Scrubs')).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
