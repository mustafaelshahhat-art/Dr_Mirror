import { Spinner, Tabs } from '@heroui/react';
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
      <div className="content-surface p-10 text-center text-sm text-default-500">
        {t('admin.products.edit.errorLoad')}
      </div>
    );
  }
  return <Inner product={query.data} />;
}

function Inner({ product }: { product: AdminProductDetailDto }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-8">
      <Link to="/admin/products" className="back-link">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.products.edit.back')}
      </Link>

      <header className="page-header">
        <h1 className="page-title">{product.nameEn}</h1>
        <p className="page-subtitle" dir="ltr">
          /{product.slug}
        </p>
      </header>

      <Tabs variant="secondary" className="space-y-4">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('admin.products.edit.title')}>
            <Tabs.Tab id="master">{t('admin.products.edit.title')}</Tabs.Tab>
            <Tabs.Tab id="variants">{t('admin.products.variants.heading')}</Tabs.Tab>
            <Tabs.Tab id="images">{t('admin.products.images.heading')}</Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="master" className="data-[selected=true]:enter-fade">
          <ProductMasterForm product={product} hideTitle />
        </Tabs.Panel>
        <Tabs.Panel id="variants" className="data-[selected=true]:enter-fade">
          <ProductVariantsSection product={product} />
        </Tabs.Panel>
        <Tabs.Panel id="images" className="data-[selected=true]:enter-fade">
          <ProductImagesSection product={product} />
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
