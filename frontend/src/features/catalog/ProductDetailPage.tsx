import { Button } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { ArrowLeft, Check, MessageSquare, PackageX, ShoppingBag } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { useCart } from '../cart/useCart';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { ProductDetailSkeleton } from '../../shared/components/Skeleton';
import { QueryErrorState } from '../../shared/components/QueryErrorState';

import { InquiryForm } from '../inquiries/components/InquiryForm';

import { ColorPicker } from './components/ColorPicker';
import { GenderChip } from './components/GenderChip';
import { ProductImageGallery } from './components/ProductImageGallery';
import { ProductInfoTabs } from './components/ProductInfoTabs';
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

  const outOfStockColors = useMemo(() => {
    if (!product || !product.variants) return new Set<string>();
    return new Set(
      product.variants
        .filter(v => v.stock === 0 || !v.isActive)
        .map(v => v.colorName)
        .filter(colorName =>
          product.variants
            .filter(v => v.colorName === colorName)
            .every(v => v.stock === 0 || !v.isActive)
        )
    );
  }, [product]);

  const { cart } = useCart();
  const { addState, addError, handleAddToCart } = useAddToCart();
  const [showInquiry, setShowInquiry] = useState(false);
  // Wraps the inquiry form so "Ask about this product" can bring it into view.
  // The wrapper carries `scroll-mt-*` so scrollIntoView lands the form below the
  // sticky header instead of underneath it (see JSX below).
  const inquiryRef = useRef<HTMLDivElement | null>(null);
  // Set when the inquire button opens a collapsed form; the effect below scrolls
  // once the form has actually mounted (its ref is null until then).
  const scrollToInquiryPendingRef = useRef(false);
  const mobileBarSentinelRef = useRef<HTMLDivElement | null>(null);

  const scrollToInquiry = useCallback(() => {
    const el = inquiryRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Defer focus until the smooth scroll settles. On iOS a focus() raised
    // outside a direct user gesture does not open the keyboard, so this moves
    // focus to the first field (full name) on desktop without the mobile
    // keyboard jank of focusing mid-scroll; preventScroll keeps the browser
    // from re-jumping past the scroll-margin offset.
    window.setTimeout(() => {
      inquiryRef.current
        ?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
        ?.focus({ preventScroll: true });
    }, 450);
  }, []);

  const handleInquireClick = useCallback(() => {
    if (showInquiry) {
      // Already open: just bring it back into view.
      scrollToInquiry();
    } else {
      scrollToInquiryPendingRef.current = true;
      setShowInquiry(true);
    }
  }, [showInquiry, scrollToInquiry]);

  // Scroll once the freshly-opened form has mounted and its ref is attached.
  useEffect(() => {
    if (showInquiry && scrollToInquiryPendingRef.current) {
      scrollToInquiryPendingRef.current = false;
      scrollToInquiry();
    }
  }, [showInquiry, scrollToInquiry]);
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
      <div className="enter-fade-up content-surface space-y-4 p-10 text-center">
        <PackageX className="mx-auto size-6 text-default-400" aria-hidden />
        <h1 className="text-lg font-semibold">
          {t('catalog.detail.notFoundTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {t('catalog.detail.notFoundSubtitle')}
        </p>
        <Link
          to="/"
          className={buttonVariants({ variant: 'primary' })}
        >
          {t('catalog.detail.backToCatalog')}
        </Link>
      </div>
    );
  }

  return (
    <article className="space-y-8">
      <Link to="/" className="back-link">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('catalog.detail.backToCatalog')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
        <ProductImageGallery images={product.images} productName={name} />

        <section className="flex flex-col gap-5">
          <Link
            to={`/?categoryId=${product.category.id}`}
            className="text-sm uppercase tracking-wide text-default-600 font-medium hover:text-foreground"
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
              outOfStockColors={outOfStockColors}
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

          <ProductInfoTabs
            description={description}
            material={product.material}
            sku={
              variantSelection.selectedVariant?.sku ??
              product.sku ??
              null
            }
            availability={
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
                    onPress={handleInquireClick}
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageSquare className="size-4" aria-hidden />
                      {t('catalog.detail.inquireCta')}
                    </span>
                  </Button>
                </div>
                <div
                  className={[
                    // Phones (<sm) also render the fixed customer bottom nav
                    // (h-14 + safe-area). Sit this bar directly above it so the
                    // two fixed layers never overlap. At sm+ the nav is hidden,
                    // so drop to bottom-0 and own the safe-area padding here.
                    'fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex gap-2 bg-background p-4 sm:bottom-0 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden',
                    hasContentBehindBar ? 'border-t border-divider/60' : 'border-t border-transparent',
                  ].join(' ')}
                >
                  <Button
                    variant="outline"
                    fullWidth
                    onPress={handleInquireClick}
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
            // scroll-mt offsets the scrollIntoView landing point below the
            // sticky header (h-14) plus the device safe-area, so the form's
            // heading and first field are clearly in view rather than tucked
            // under the navbar. Works the same in RTL/LTR and light/dark.
            <div
              ref={inquiryRef}
              className="scroll-mt-[calc(env(safe-area-inset-top)+5rem)]"
            >
              <InquiryForm
                productId={product.id}
                defaultSubject={isAr ? product.nameAr : product.nameEn}
              />
            </div>
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
      {/* Bottom spacer reserves room so the last content scrolls clear of the
          fixed action bar. Combined with the app shell's bottom padding this
          clears both the action bar and (on phones) the bottom nav beneath it.
          When the inquiry form is open it grows so the form's submit button can
          be scrolled fully above the action bar (~bar height + bottom nav). */}
      <div
        className="lg:hidden"
        style={{
          height: showInquiry
            ? 'calc(8rem + env(safe-area-inset-bottom))'
            : 'calc(4rem + env(safe-area-inset-bottom))',
        }}
        aria-hidden
      />
    </article>
  );
}

