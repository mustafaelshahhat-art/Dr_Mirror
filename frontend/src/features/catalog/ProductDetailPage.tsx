import { Button, Spinner } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';

import { ColorPicker } from './components/ColorPicker';
import { GenderChip } from './components/GenderChip';
import { SizePicker } from './components/SizePicker';
import {
  useLocalizedDescription,
  useLocalizedField,
  useProductDetailQuery,
  useVariantSelection,
} from './hooks';

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
  const [activeImage, setActiveImage] = useState(0);
  const variantSelection = useVariantSelection(product);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner aria-label={t('catalog.detail.loading')} />
      </div>
    );
  }

  if (query.isError || !product) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    return (
      <div className="space-y-4 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">
          {isNotFound ? t('catalog.detail.notFoundTitle') : t('catalog.detail.errorTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {isNotFound
            ? t('catalog.detail.notFoundSubtitle')
            : t('catalog.detail.errorSubtitle')}
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-medium bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
        >
          {t('catalog.detail.backToCatalog')}
        </Link>
      </div>
    );
  }

  const images = product.images;
  const currentImage = images[activeImage] ?? images[0];

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
        <section className="space-y-3">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-large border border-divider/60 bg-default-100">
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.alt ?? name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-default-400">
                —
              </div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto" role="tablist">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeImage}
                  onClick={() => setActiveImage(idx)}
                  className={
                    idx === activeImage
                      ? 'h-16 w-20 shrink-0 overflow-hidden rounded-medium ring-2 ring-primary'
                      : 'h-16 w-20 shrink-0 overflow-hidden rounded-medium border border-divider/60 transition-shadow hover:ring-1 hover:ring-default-300'
                  }
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </section>

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

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
            <Button variant="primary" isDisabled fullWidth>
              {t('catalog.detail.addToCartSoon')}
            </Button>
            <Button variant="outline" isDisabled fullWidth>
              {t('catalog.detail.inquireSoon')}
            </Button>
          </div>
          <p className="text-xs text-default-500">{t('catalog.detail.cartHint')}</p>
        </section>
      </div>
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
