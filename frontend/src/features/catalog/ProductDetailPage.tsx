import { Button } from '@heroui/react';
import { ArrowLeft, Check, MessageSquare, ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { useCart } from '../cart/useCart';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { LinkButton } from '../../shared/components/LinkButton';
import { ProductDetailSkeleton } from '../../shared/components/Skeleton';
import { QueryErrorState } from '../../shared/components/QueryErrorState';

import { InquiryForm } from '../inquiries/components/InquiryForm';

import { ColorPicker } from './components/ColorPicker';
import { GenderChip } from './components/GenderChip';
import { ProductImageGallery } from './components/ProductImageGallery';
import { SizePicker } from './components/SizePicker';
import {
  useLocalizedDescription,
  useLocalizedField,
  useProductDetailQuery,
  useVariantSelection,
} from './hooks';
import { useAddToCart } from './hooks/useAddToCart';

export function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = i18n.language?.startsWith('ar');
  const query = useProductDetailQuery(slug);
  const product = query.data;
  const name = useLocalizedField(product);
  const description = useLocalizedDescription(product);
  const categoryName = useLocalizedField(product?.category);
  const variantSelection = useVariantSelection(product);
  const { cart } = useCart();
  const { addState, addError, handleAddToCart } = useAddToCart();
  const [showInquiry, setShowInquiry] = useState(false);
  const mobileBarSentinelRef = useRef<HTMLDivElement | null>(null);
  // Whether content is currently scrolled behind the mobile action bar. Used
  // to gate the bar's top border — a hairline that shouldn't appear when the
  // bar visually floats over an empty page bottom.
  const [hasContentBehindBar, setHasContentBehindBar] = useState(false);

  useEffect(() => {
    const sentinel = mobileBarSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the sentinel is visible at the bottom of the viewport, the
        // page has scrolled to the natural end — nothing is hidden behind
        // the bar, so the border can vanish.
        setHasContentBehindBar(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [product?.id]);

  if (query.isLoading) {
    return (
      <div aria-busy="true" aria-label={t('catalog.detail.loading')}>
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (query.isError || !product) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    if (!isNotFound) {
      return (
        <QueryErrorState
          message={t('catalog.detail.errorSubtitle')}
          retryLabel={t('common.query.retry')}
          onRetry={() => void query.refetch()}
        />
      );
    }
    return (
      <div className="space-y-4 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">
          {t('catalog.detail.notFoundTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {t('catalog.detail.notFoundSubtitle')}
        </p>
        <LinkButton
          to="/"
        >
          {t('catalog.detail.backToCatalog')}
        </LinkButton>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('catalog.detail.backToCatalog')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductImageGallery images={product.images} productName={name} />

        <section className="flex flex-col gap-4">
          <Link
            to={`/?categoryId=${product.category.id}`}
            className="text-xs uppercase tracking-wide text-default-500 hover:text-foreground"
          >
            {categoryName}
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(product.price, lang)}
            </span>
            <GenderChip gender={product.gender} />
          </div>

          {variantSelection.colors.length > 0 ? (
            <ColorPicker
              colors={variantSelection.colors}
              selected={variantSelection.selectedColor}
              onSelect={variantSelection.setColor}
            />
          ) : null}

          {variantSelection.sizes.length > 0 ? (
            <SizePicker
              sizes={variantSelection.sizes}
              variantsForColor={variantSelection.variants.filter(
                (v) => v.colorName === variantSelection.selectedColor,
              )}
              selected={variantSelection.selectedSize}
              onSelect={variantSelection.setSize}
            />
          ) : null}

          <dl className="grid grid-cols-2 gap-3 rounded-large border border-divider/60 bg-content1 p-4 text-sm sm:grid-cols-3">
            {product.brand ? (
              <Field label={t('catalog.detail.brand')} value={product.brand} />
            ) : null}
            {product.material ? (
              <Field label={t('catalog.detail.material')} value={product.material} />
            ) : null}
            {variantSelection.selectedVariant ? (
              <Field
                label={t('catalog.detail.skuVariant')}
                value={variantSelection.selectedVariant.sku}
              />
            ) : product.sku ? (
              <Field label={t('catalog.detail.sku')} value={product.sku} />
            ) : null}
            <Field
              label={t('catalog.detail.availability')}
              value={
                variantSelection.selectedVariant
                  ? variantSelection.selectedVariant.stock > 0
                    ? t('catalog.detail.stockForVariant', {
                        count: variantSelection.selectedVariant.stock,
                        size: variantSelection.selectedVariant.size,
                        color: isAr
                          ? variantSelection.selectedVariant.colorNameAr
                          : variantSelection.selectedVariant.colorName,
                      })
                    : t('catalog.detail.stockOut')
                  : t('catalog.detail.pickVariant')
              }
            />
          </dl>

          <p className="whitespace-pre-line text-sm leading-relaxed text-default-700 dark:text-default-300">
            {description}
          </p>

          {(() => {
            const v = variantSelection.selectedVariant;
            const addDisabled =
              addState === 'adding' || !v || v.stock <= 0;
            const onAdd = () => {
              if (!v) return;
              void handleAddToCart({
                productVariantId: v.id,
                quantity: 1,
                productId: product.id,
                productSlug: product.slug,
                nameAr: product.nameAr,
                nameEn: product.nameEn,
                size: v.size,
                colorName: v.colorName,
                colorNameAr: v.colorNameAr,
                colorHex: v.colorHex,
                sku: v.sku,
                unitPrice: product.price,
                primaryImageUrl: product.images[0]?.url ?? null,
                variantStock: v.stock,
              });
            };
            const addLabel =
              addState === 'adding'
                ? t('cart.adding')
                : addState === 'added'
                  ? t('cart.addedToCart')
                  : !v
                    ? t('cart.selectVariantFirst')
                    : v.stock <= 0
                      ? t('cart.outOfStockShort')
                      : t('cart.addToCart');
            return (
              <>
                <div className="hidden flex-col gap-2 pt-2 lg:flex lg:flex-row lg:items-center">
                  <Button
                    variant="primary"
                    fullWidth
                    isDisabled={addDisabled}
                    onPress={onAdd}
                  >
                    <span className="inline-flex items-center gap-2">
                      {addState === 'added' ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <ShoppingBag className="size-4" aria-hidden />
                      )}
                      {addLabel}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    onPress={() => setShowInquiry((s) => !s)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageSquare className="size-4" aria-hidden />
                      {t('catalog.detail.inquireCta')}
                    </span>
                  </Button>
                </div>
                <div
                  className={[
                    'fixed inset-x-0 bottom-0 z-30 flex gap-2 bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden',
                    hasContentBehindBar ? 'border-t border-divider/60' : 'border-t border-transparent',
                  ].join(' ')}
                >
                  <Button
                    variant="outline"
                    fullWidth
                    onPress={() => setShowInquiry((s) => !s)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageSquare className="size-4" aria-hidden />
                      {t('catalog.detail.inquireCta')}
                    </span>
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    isDisabled={addDisabled}
                    onPress={onAdd}
                  >
                    <span className="inline-flex items-center gap-2">
                      {addState === 'added' ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <ShoppingBag className="size-4" aria-hidden />
                      )}
                      {addLabel}
                    </span>
                  </Button>
                </div>
              </>
            );
          })()}
          {showInquiry ? (
            <InquiryForm
              productId={product.id}
              defaultSubject={isAr ? product.nameAr : product.nameEn}
            />
          ) : null}
          {addError ? (
            <p className="text-xs text-danger" role="alert">
              {addError}
            </p>
          ) : (
            <p className="text-xs text-default-500">
              {cart.totalQuantity > 0
                ? t('cart.subtitle', { count: cart.totalQuantity })
                : t('catalog.detail.cartHint')}
            </p>
          )}
        </section>
      </div>
      {/* Sentinel sits right above the spacer; the IntersectionObserver above
          watches it to decide whether the mobile bar's top border should show. */}
      <div ref={mobileBarSentinelRef} className="h-px lg:hidden" aria-hidden />
      <div
        className="lg:hidden"
        style={{ height: 'calc(5rem + env(safe-area-inset-bottom))' }}
        aria-hidden
      />
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-default-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
