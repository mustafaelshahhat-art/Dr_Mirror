import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import testI18n from '../../test/testI18n';
import { ProductDetailPage } from './ProductDetailPage';
import type { ProductDetailDto } from './types';

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
  category: {
    id: 'cat-1',
    nameAr: 'سكرب',
    nameEn: 'Scrubs',
    slug: 'scrubs',
    displayOrder: 1,
  },
  images: [
    { id: 'img-1', url: '/images/scrub-1.jpg', alt: 'Front view', displayOrder: 1 },
    { id: 'img-2', url: '/images/scrub-2.jpg', alt: null, displayOrder: 2 },
  ],
  variants: [
    {
      id: 'var-1',
      size: 'M',
      colorName: 'Navy',
      colorNameAr: 'كحلي',
      colorHex: '#000080',
      sku: 'SCR-001-M-NAV',
      stock: 10,
      isActive: true,
    },
  ],
};

const MOCK_VARIANT_SELECTION = {
  variants: MOCK_PRODUCT.variants,
  colors: [
    {
      id: 'var-1',
      size: 'M',
      colorName: 'Navy',
      colorNameAr: 'كحلي',
      colorHex: '#000080',
      sku: 'SCR-001-M-NAV',
      stock: 10,
      isActive: true,
    },
  ],
  sizes: ['M'],
  selectedColor: 'Navy',
  selectedSize: 'M',
  selectedVariant: MOCK_PRODUCT.variants[0],
  setColor: vi.fn(),
  setSize: vi.fn(),
};

const mockUseParams = vi.fn();
const mockUseProductDetailQuery = vi.fn();
const mockUseLocalizedField = vi.fn();
const mockUseLocalizedDescription = vi.fn();
const mockUseVariantSelection = vi.fn();
const mockUseAddToCart = vi.fn();
const mockUseCart = vi.fn();

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
    useProductDetailQuery: (...args: unknown[]) => mockUseProductDetailQuery(...args),
    useLocalizedField: (...args: unknown[]) => mockUseLocalizedField(...args),
    useLocalizedDescription: (...args: unknown[]) => mockUseLocalizedDescription(...args),
    useVariantSelection: (...args: unknown[]) => mockUseVariantSelection(...args),
  };
});

vi.mock('./hooks/useAddToCart', () => ({
  useAddToCart: (...args: unknown[]) => mockUseAddToCart(...args),
}));

vi.mock('../cart/useCart', () => ({
  useCart: (...args: unknown[]) => mockUseCart(...args),
}));

function setupMocks() {
  mockUseParams.mockReturnValue({ slug: MOCK_SLUG });
  mockUseProductDetailQuery.mockReturnValue({
    data: MOCK_PRODUCT,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    error: null,
  });
  mockUseVariantSelection.mockReturnValue(MOCK_VARIANT_SELECTION);
  mockUseAddToCart.mockReturnValue({
    addState: 'idle',
    addError: null,
    handleAddToCart: vi.fn(),
  });
  mockUseCart.mockReturnValue({
    cart: { items: [], subTotal: 0, totalQuantity: 0 },
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    isCartLoading: false,
  });
}

beforeEach(() => {
  setupMocks();
});

afterEach(() => {
  document.documentElement.classList.remove('dark', 'light');
});

describe.each([
  { theme: 'dark', lang: 'ar', label: 'dark/ar (RTL)' },
  { theme: 'dark', lang: 'en', label: 'dark/en (LTR)' },
  { theme: 'light', lang: 'ar', label: 'light/ar (RTL)' },
  { theme: 'light', lang: 'en', label: 'light/en (LTR)' },
])('ProductDetailPage — $label', ({ theme, lang }) => {
  function renderInState() {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    const isAr = lang === 'ar';
    mockUseLocalizedField.mockImplementation(
      (entity: { nameAr: string; nameEn: string } | undefined) =>
        isAr ? entity?.nameAr ?? '' : entity?.nameEn ?? '',
    );
    mockUseLocalizedDescription.mockImplementation(
      (entity: { descriptionAr: string; descriptionEn: string } | undefined) =>
        isAr ? entity?.descriptionAr ?? '' : entity?.descriptionEn ?? '',
    );
    return { isAr, expectedName: isAr ? MOCK_PRODUCT.nameAr : MOCK_PRODUCT.nameEn };
  }

  it('renders without crashing', async () => {
    await testI18n.changeLanguage(lang);
    const { expectedName } = renderInState();
    renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText(expectedName)).toBeInTheDocument();
  });

  it('renders product images with alt text', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<ProductDetailPage />);

    const mainImage = screen.getByRole('img', { name: /front view/i });
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('alt', 'Front view');

    const allImages = screen.getAllByRole('img');
    for (const img of allImages) {
      expect(img).toHaveAttribute('alt');
    }
  });

  it('has correct back-link arrow rotation for RTL vs LTR', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<ProductDetailPage />);

    const backLinkText = lang === 'ar' ? 'العودة إلى المنتجات' : 'Back to catalog';
    const backLink = screen.getByRole('link', { name: backLinkText });
    expect(backLink).toBeInTheDocument();

    const arrow = backLink.querySelector('.lucide-arrow-left');
    expect(arrow).toBeInTheDocument();

    expect(arrow).toHaveClass('rtl:rotate-180');
  });

  it('renders brand and material fields when present', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<ProductDetailPage />);

    expect(screen.getByText('MediWear')).toBeInTheDocument();
    expect(screen.getByText('Cotton')).toBeInTheDocument();
  });

  it('renders add-to-cart buttons in idle state', async () => {
    await testI18n.changeLanguage(lang);
    renderInState();
    renderWithProviders(<ProductDetailPage />);

    const addLabel = lang === 'ar' ? 'أضف إلى السلة' : 'Add to cart';
    const inquireLabel = lang === 'ar' ? 'اسأل عن هذا المنتج' : 'Ask about this product';

    const addButtons = screen.getAllByRole('button', { name: addLabel });
    expect(addButtons.length).toBeGreaterThanOrEqual(1);

    const inquireButtons = screen.getAllByRole('button', { name: inquireLabel });
    expect(inquireButtons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ProductDetailPage — loading state', () => {
  it('renders skeleton while loading', async () => {
    mockUseProductDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    await testI18n.changeLanguage('en');
    renderWithProviders(<ProductDetailPage />);

    expect(screen.getByLabelText('Loading product...')).toBeInTheDocument();
  });
});

describe('ProductDetailPage — error state', () => {
  it('renders error state on query error', async () => {
    mockUseProductDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 500 } },
      refetch: vi.fn(),
    });

    await testI18n.changeLanguage('en');
    renderWithProviders(<ProductDetailPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders not-found state for 404', async () => {
    mockUseProductDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 404 } },
      refetch: vi.fn(),
    });

    await testI18n.changeLanguage('en');
    renderWithProviders(<ProductDetailPage />);

    expect(screen.getByText('Product not found')).toBeInTheDocument();
  });
});
