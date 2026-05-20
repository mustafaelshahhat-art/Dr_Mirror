import { Card, Chip, Separator, Tabs } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
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
        className="space-y-8"
        aria-busy="true"
        aria-label={t('admin.detail.loading')}
      >
        <Skeleton className="h-4 w-32" />
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-24 rounded-medium" />
        </header>
        <Card>
          <Card.Content className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-40" />
          </Card.Content>
        </Card>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <DetailFieldSkeleton key={i} />
            ))}
          </div>
          <Card>
            <Card.Content className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                // eslint-disable-next-line i18next/no-literal-string -- skeleton size prop, not user copy
                <DetailFieldSkeleton key={i} valueClass="w-32" />
              ))}
            </Card.Content>
          </Card>
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
      <div className="enter-fade-up content-surface space-y-3 p-10 text-center">
        <h1 className="text-lg font-semibold">
          {t('admin.detail.notFoundTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {t('admin.detail.notFoundSubtitle')}
        </p>
        <Link
          to="/admin/orders"
          className={buttonVariants({ variant: 'primary' })}
        >
          {t('admin.detail.backToList')}
        </Link>
      </div>
    );
  }

  const order = query.data;
  const isNonCod = order.paymentMethodKind !== PAYMENT_METHOD_KIND.Cod;

  return (
    <section className="space-y-8">
      <Link to="/admin/orders" className="back-link">
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
        <Chip
          variant="soft"
          size="sm"
          color={
            order.paymentStatusLabel === 'cod' || order.paymentStatusLabel === 'paid'
              ? 'success'
              : order.paymentStatusLabel === 'cancelled'
                ? 'danger'
                : 'warning'
          }
        >
          {t(`admin.paymentStatus.${order.paymentStatusLabel}`)}
        </Chip>
      </header>

      <Card>
        <Card.Header>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
            {t('admin.detail.buyerHeading')}
          </h2>
        </Card.Header>
        <Card.Content>
          <p className="text-sm font-medium text-foreground">{order.buyer.fullName}</p>
          <a
            href={`mailto:${order.buyer.email}`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            {order.buyer.email}
          </a>
        </Card.Content>
      </Card>

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
              <Card>
                <Card.Content>
                  <OrderTimeline order={order} />
                </Card.Content>
              </Card>
            </Tabs.Panel>
            {isNonCod ? (
              <Tabs.Panel id="proofs">
                <Card aria-labelledby="admin-proofs-heading">
                  <Card.Header>
                <h2
                  id="admin-proofs-heading"
                  className="text-base font-semibold text-foreground"
                >
                      {t('admin.detail.proofsHeading')}
                    </h2>
                  </Card.Header>
                  <Card.Content>
                    <AdminProofReview
                      orderNumber={order.orderNumber}
                      proofs={order.paymentProofs}
                    />
                  </Card.Content>
                </Card>
              </Tabs.Panel>
            ) : null}
            <Tabs.Panel id="items">
              <section aria-labelledby="admin-items-heading" className="space-y-2">
                <h2 id="admin-items-heading" className="text-base font-semibold text-foreground">
                  {t('admin.detail.itemsHeading')}
                </h2>
                <ul className="space-y-2">
                  {order.items.map((item) => {
                    const name = isAr ? item.nameAr : item.nameEn;
                    const colorName = isAr ? item.colorNameAr : item.colorName;
                    return (
                      <li key={item.id}>
                        <Card>
                          <Card.Content className="flex gap-3">
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
                              <p className="mt-0.5 font-mono text-sm uppercase tracking-wide font-medium text-default-500">
                                {item.sku}
                              </p>
                            </div>
                            <span className="self-start text-sm font-semibold tabular-nums">
                              {formatCurrency(item.lineTotal, lang)}
                            </span>
                          </Card.Content>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </Tabs.Panel>
          </Tabs>

          <section aria-labelledby="admin-address-heading" className="space-y-2">
            <h2 id="admin-address-heading" className="text-base font-semibold text-foreground">
              {t('admin.detail.shippingHeading')}
            </h2>
            <Card>
              <Card.Content className="text-sm leading-relaxed">
                <p className="font-medium">{order.shippingAddress.recipientName}</p>
                <p className="text-default-700 dark:text-default-300">
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
              </Card.Content>
            </Card>
          </section>

          {order.buyerNote ? (
            <section aria-labelledby="admin-note-heading" className="space-y-2">
              <h2 id="admin-note-heading" className="text-base font-semibold text-foreground">
                {t('admin.detail.buyerNoteHeading')}
              </h2>
              <Card>
                <Card.Content>
                  <p className="text-sm italic">
                    {t('admin.detail.buyerNoteQuoted', { note: order.buyerNote })}
                  </p>
                </Card.Content>
              </Card>
            </section>
          ) : null}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <Card.Header>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-default-700">
              {t('admin.detail.summary')}
            </h2>
          </Card.Header>
          <Card.Content className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-strong">{t('admin.detail.subTotal')}</dt>
                <dd className="tabular-nums">{formatCurrency(order.subTotal, lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-strong">{t('admin.detail.shipping')}</dt>
                <dd className="tabular-nums">
                  {order.shippingFee > 0
                    ? formatCurrency(order.shippingFee, lang)
                    : t('admin.detail.freeShipping')}
                </dd>
              </div>
            </dl>
            {/* Separator per Anatomy A.21; maps border-t border-divider purely-visual separator */}
            <Separator />
            <div className="flex justify-between pt-2 text-base font-semibold">
              <span>{t('admin.detail.total')}</span>
              <span className="tabular-nums">{formatCurrency(order.total, lang)}</span>
            </div>
            {/* Separator per Anatomy A.21 */}
            <Separator />
            <div className="pt-3">
              <h3 className="text-sm uppercase tracking-wide text-default-600 font-medium">
                {t('admin.detail.paymentMethod')}
              </h3>
              <p className="mt-1 text-sm font-medium">
                {isAr ? order.paymentMethodNameAr : order.paymentMethodNameEn}
              </p>
            </div>
          </Card.Content>
        </Card>
      </div>
    </section>
  );
}
