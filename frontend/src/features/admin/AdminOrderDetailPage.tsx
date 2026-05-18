import { Tabs } from '@heroui/react';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { Snippet } from '../../shared/components/Snippet';

import { OrderStatusBadge } from '../orders/components/OrderStatusBadge';
import { OrderTimeline } from '../orders/components/OrderTimeline';
import { PAYMENT_METHOD_KIND } from '../orders/types';

import { AdminProofReview } from './components/AdminProofReview';
import { AdminTransitionActions } from './components/AdminTransitionActions';
import { useAdminOrderQuery } from './hooks';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { LinkButton } from '../../shared/components/LinkButton';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { DetailFieldSkeleton, Skeleton } from '../../shared/components/Skeleton';

/**
 * Admin's view of a single order at <c>/admin/orders/:orderNumber</c>.
 * Same data shape as the buyer view, plus:
 *   - Buyer summary at the top (name + email)
 *   - <c>AdminTransitionActions</c>: every legal next state as a button
 *   - <c>AdminProofReview</c>: Approve / Reject inline for pending proofs
 */
export function AdminOrderDetailPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const query = useAdminOrderQuery(orderNumber);

  if (query.isLoading) {
    return (
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label={t('admin.detail.loading')}
      >
        <Skeleton className="h-4 w-32" />
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-24 rounded-md" />
        </header>
        <article className="rounded-large border border-divider/60 bg-content1 p-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-40" />
        </article>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <DetailFieldSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-3 rounded-large border border-divider/60 bg-content1 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              // eslint-disable-next-line i18next/no-literal-string -- skeleton size prop, not user copy
              <DetailFieldSkeleton key={i} valueClass="w-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    if (!isNotFound) {
      return (
        <QueryErrorState
          message={t('admin.detail.errorSubtitle')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      );
    }
    return (
      <div className="space-y-3 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">
          {t('admin.detail.notFoundTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {t('admin.detail.notFoundSubtitle')}
        </p>
        <LinkButton
          to="/admin/orders"
        >
          {t('admin.detail.backToList')}
        </LinkButton>
      </div>
    );
  }

  const order = query.data;
  const isNonCod = order.paymentMethodKind !== PAYMENT_METHOD_KIND.Cod;

  return (
    <section className="space-y-6">
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.detail.backToList')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
            <Snippet
              value={order.orderNumber}
              aria-label={t('orders.paymentInstructions.copy')}
              text={t('orders.paymentInstructions.copy')}
              copiedText={t('orders.paymentInstructions.copied')}
              tooltipPlacement="end"
            >
              <span className="sr-only" aria-hidden />
            </Snippet>
          </div>
          <p className="text-sm text-default-500">
            {t('admin.detail.subtitle', {
              count: order.items.length,
              total: formatCurrency(order.total, lang),
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <article className="rounded-large border border-divider/60 bg-content1 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
          {t('admin.detail.buyerHeading')}
        </h2>
        <p className="mt-1 text-sm font-medium text-foreground">{order.buyer.fullName}</p>
        <a
          href={`mailto:${order.buyer.email}`}
          className="text-sm text-primary underline-offset-2 hover:underline"
          dir="ltr"
        >
          {order.buyer.email}
        </a>
      </article>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <AdminTransitionActions order={order} />

          <Tabs variant="secondary" defaultSelectedKey="items" className="space-y-4">
            <Tabs.ListContainer>
              <Tabs.List aria-label={t('admin.detail.summary')}>
                <Tabs.Tab id="timeline">{t('admin.detail.timeline')}</Tabs.Tab>
                {isNonCod ? (
                  <Tabs.Tab id="proofs">{t('admin.detail.proofsHeading')}</Tabs.Tab>
                ) : null}
                <Tabs.Tab id="items">{t('admin.detail.itemsHeading')}</Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="timeline">
              <section className="rounded-large border border-divider/60 bg-content1 p-4">
                <OrderTimeline order={order} />
              </section>
            </Tabs.Panel>
            {isNonCod ? (
              <Tabs.Panel id="proofs">
                <section
                  aria-labelledby="admin-proofs-heading"
                  className="space-y-3 rounded-large border border-divider/60 bg-content1 p-4"
                >
                  <h2
                    id="admin-proofs-heading"
                    className="text-sm font-semibold text-foreground"
                  >
                    {t('admin.detail.proofsHeading')}
                  </h2>
                  <AdminProofReview
                    orderNumber={order.orderNumber}
                    proofs={order.paymentProofs}
                  />
                </section>
              </Tabs.Panel>
            ) : null}
            <Tabs.Panel id="items">
              <section aria-labelledby="admin-items-heading" className="space-y-2">
                <h2 id="admin-items-heading" className="text-sm font-semibold text-foreground">
                  {t('admin.detail.itemsHeading')}
                </h2>
                <ul className="space-y-2">
                  {order.items.map((item) => {
                    const name = isAr ? item.nameAr : item.nameEn;
                    const colorName = isAr ? item.colorNameAr : item.colorName;
                    return (
                      <li
                        key={item.id}
                        className="flex gap-3 rounded-medium border border-divider/60 bg-content1 p-3"
                      >
                        <Link
                          to={`/products/${item.productSlug}`}
                          className="size-16 shrink-0 overflow-hidden rounded-medium bg-default-100"
                        >
                          {item.primaryImageUrl ? (
                            <img
                              src={item.primaryImageUrl}
                              alt={name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-default-400"
                              role="img"
                              aria-label={t('catalog.detail.noImage')}
                            >
                              <ImageOff className="size-5" aria-hidden />
                            </div>
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">{name}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-default-500">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="size-3 rounded-full ring-1 ring-default-200"
                                style={{ backgroundColor: item.colorHex }}
                                aria-hidden
                              />
                              {colorName}
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              {t('admin.detail.sizeLabel')} {item.size}
                            </span>
                            <span aria-hidden>·</span>
                            <span>{t('common.quantityMultiplier', { count: item.quantity })}</span>
                          </p>
                          <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-default-400">
                            {item.sku}
                          </p>
                        </div>
                        <span className="self-start text-sm font-semibold tabular-nums">
                          {formatCurrency(item.lineTotal, lang)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </Tabs.Panel>
          </Tabs>

          <section aria-labelledby="admin-address-heading" className="space-y-2">
            <h2 id="admin-address-heading" className="text-sm font-semibold text-foreground">
              {t('admin.detail.shippingHeading')}
            </h2>
            <div className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm leading-relaxed">
              <p className="font-medium">{order.shippingAddress.recipientName}</p>
              <p className="text-default-700 dark:text-default-300" dir="ltr">
                {order.shippingAddress.phone}
              </p>
              <p className="mt-1 text-default-700 dark:text-default-300">
                {order.shippingAddress.streetAddress}
                {order.shippingAddress.apartment
                  ? `, ${t('admin.detail.apartmentShort')} ${order.shippingAddress.apartment}`
                  : ''}
                {order.shippingAddress.floor
                  ? `, ${t('admin.detail.floorShort')} ${order.shippingAddress.floor}`
                  : ''}
              </p>
              <p className="text-default-700 dark:text-default-300">
                {order.shippingAddress.city},{' '}
                {t(
                  `governorates.${order.shippingAddress.governorate}`,
                  order.shippingAddress.governorate,
                )}
              </p>
              {order.shippingAddress.landmark ? (
                <p className="mt-1 text-xs text-default-500">
                  {t('admin.detail.landmark')}: {order.shippingAddress.landmark}
                </p>
              ) : null}
              {order.shippingAddress.notes ? (
                <p className="mt-1 text-xs italic text-default-500">
                  {order.shippingAddress.notes}
                </p>
              ) : null}
            </div>
          </section>

          {order.buyerNote ? (
            <section aria-labelledby="admin-note-heading" className="space-y-2">
              <h2 id="admin-note-heading" className="text-sm font-semibold text-foreground">
                {t('admin.detail.buyerNoteHeading')}
              </h2>
              <p className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm italic">
                {t('admin.detail.buyerNoteQuoted', { note: order.buyerNote })}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="h-fit space-y-4 rounded-large border border-divider/60 bg-content1 p-4 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
            {t('admin.detail.summary')}
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-default-500">{t('admin.detail.subTotal')}</dt>
              <dd className="tabular-nums">{formatCurrency(order.subTotal, lang)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-default-500">{t('admin.detail.shipping')}</dt>
              <dd className="tabular-nums">
                {order.shippingFee > 0
                  ? formatCurrency(order.shippingFee, lang)
                  : t('admin.detail.freeShipping')}
              </dd>
            </div>
            <div className="flex justify-between border-t border-divider/60 pt-2 text-base font-semibold">
              <dt>{t('admin.detail.total')}</dt>
              <dd className="tabular-nums">{formatCurrency(order.total, lang)}</dd>
            </div>
          </dl>
          <div className="border-t border-divider/60 pt-3">
            <h3 className="text-xs uppercase tracking-wide text-default-500">
              {t('admin.detail.paymentMethod')}
            </h3>
            <p className="mt-1 text-sm font-medium">
              {isAr ? order.paymentMethodNameAr : order.paymentMethodNameEn}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
