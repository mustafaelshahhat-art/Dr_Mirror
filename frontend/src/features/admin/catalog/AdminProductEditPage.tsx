import { Spinner } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { useAdminProductQuery } from './hooks';
import type { AdminProductDetailDto } from './types';

import { ProductImagesSection } from './components/ProductImagesSection';
import { ProductMasterForm } from './components/ProductMasterForm';
import { ProductVariantsSection } from './components/ProductVariantsSection';

export function AdminProductEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const query = useAdminProductQuery(id);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner aria-label={t('admin.products.edit.loading')} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
        {t('admin.products.edit.errorLoad')}
      </div>
    );
  }
  return <Inner product={query.data} />;
}

function Inner({ product }: { product: AdminProductDetailDto }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.products.edit.back')}
      </Link>

      <ProductMasterForm product={product} />
      <ProductVariantsSection product={product} />
      <ProductImagesSection product={product} />
    </section>
  );
}
