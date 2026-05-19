import { Card, Separator } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import {
  CartLineSkeleton,
  CheckoutSummarySkeleton,
  Skeleton,
} from '../../shared/components/Skeleton';

import { Snippet } from '../../shared/components/Snippet';

import { CancelOrderButton } from './components/CancelOrderButton';
import { OrderStatusBadge } from './components/OrderStatusBadge';
import { OrderTimeline } from './components/OrderTimeline';
import { PaymentInstructionsCard } from './components/PaymentInstructionsCard';
import { PaymentProofUpload } from './components/PaymentProofUpload';
import { PaymentProofsList } from './components/PaymentProofsList';
import { useMyOrderQuery } from './hooks';
import { ORDER_STATUSES, PAYMENT_METHOD_KIND } from './types';

export function OrderDetailPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const query = useMyOrderQuery(orderNumber);

  if (query.isLoading) {
    return (
      <section
        className="space-y-8"
        aria-busy="true"
        aria-label={t('orders.detail.loading')}
      >
        <Skeleton className="h-4 w-32" />
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-24" />
        </header>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CartLineSkeleton key={i} />
            ))}
          </div>
          <CheckoutSummarySkeleton />
        </div>
      </section>
    );
  }

  if (query.isError || !query.data) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    if (!isNotFound) {
      return (
        <QueryErrorState
          message={t('orders.detail.errorSubtitle')}
          retryLabel={t('common.query.retry')}
          onRetry={() => void query.refetch()}
        />
      );
    }
    return (
      <div className="enter-fade-up space-y-3 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">
          {t('orders.detail.notFoundTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {t('orders.detail.notFoundSubtitle')}
        </p>
        <Link
          to="/account/orders"
          className={buttonVariants({ variant: 'primary' })}
        >
          {t('orders.detail.backToList')}
        </Link>
      </div>
    );
  }

  const order = query.data;
  const isNonCod = order.paymentMethodKind !== PAYMENT_METHOD_KIND.Cod;
  const showInstructions =
    isNonCod &&
    (order.status === ORDER_STATUSES.Pending ||
      order.status === ORDER_STATUSES.PendingPaymentReview);
  const canUploadProof =
    isNonCod &&
    (order.status === ORDER_STATUSES.Pending ||
      order.status === ORDER_STATUSES.PendingPaymentReview);

  return (
    <section className="space-y-8">
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('orders.detail.backToList')}
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
            {t('orders.detail.subtitle', {
              count: order.items.length,
              total: formatCurrency(order.total, lang),
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {showInstructions ? <PaymentInstructionsCard order={order} /> : null}

          {canUploadProof ? <PaymentProofUpload orderNumber={order.orderNumber} /> : null}

          {order.paymentProofs.length > 0 ? (
            <PaymentProofsList orderNumber={order.orderNumber} proofs={order.paymentProofs} />
          ) : null}

          <section aria-labelledby="items-heading" className="cq space-y-2">
            <h2 id="items-heading" className="text-sm font-semibold text-foreground">
              {t('orders.detail.itemsHeading')}
            </h2>
            <ul className="space-y-2">
              {order.items.map((item) => {
                const name = isAr ? item.nameAr : item.nameEn;
                const colorName = isAr ? item.colorNameAr : item.colorName;
                return (
                  <li key={item.id}>
                    <Card>
                      <Card.Content className="grid grid-cols-1 gap-3 @md:grid-cols-3 @md:items-start">
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
                          <Link
                            to={`/products/${item.productSlug}`}
                            className="line-clamp-2 text-sm font-medium hover:underline"
                          >
                            {name}
                          </Link>
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
                              {t('orders.detail.sizeLabel')} {item.size}
                            </span>
                            <span aria-hidden>·</span>
                            <span>{t('common.quantityMultiplier', { count: item.quantity })}</span>
                          </p>
                          <p className="mt-0.5 text-xs font-mono uppercase tracking-wide text-default-400">
                            {item.sku}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums @md:text-end">
                          {formatCurrency(item.lineTotal, lang)}
                        </span>
                      </Card.Content>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="address-heading" className="space-y-2">
            <h2 id="address-heading" className="text-sm font-semibold text-foreground">
              {t('orders.detail.shippingHeading')}
            </h2>
            <Card>
              <Card.Content className="text-sm leading-relaxed">
                <p className="font-medium">{order.shippingAddress.recipientName}</p>
                <p className="text-default-700 dark:text-default-300" dir="ltr">
                  {order.shippingAddress.phone}
                </p>
                <p className="mt-1 text-default-700 dark:text-default-300">
                  {order.shippingAddress.streetAddress}
                  {order.shippingAddress.apartment
                    ? `, ${t('checkout.address.apartmentShort')} ${order.shippingAddress.apartment}`
                    : ''}
                  {order.shippingAddress.floor
                    ? `, ${t('checkout.address.floorShort')} ${order.shippingAddress.floor}`
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
                    {t('checkout.address.landmark')}: {order.shippingAddress.landmark}
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

          <CancelOrderButton order={order} />
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <Card.Header>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
              {t('orders.detail.summary')}
            </h2>
          </Card.Header>
          <Card.Content className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-default-500">{t('orders.detail.subTotal')}</dt>
                <dd className="tabular-nums">{formatCurrency(order.subTotal, lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-default-500">{t('orders.detail.shipping')}</dt>
                <dd className="tabular-nums">
                  {order.shippingFee > 0
                    ? formatCurrency(order.shippingFee, lang)
                    : t('orders.detail.freeShipping')}
                </dd>
              </div>
            </dl>
            {/* Separator per Anatomy A.21; maps border-t border-divider purely-visual separator */}
            <Separator />
            <div className="flex justify-between pt-2 text-base font-semibold">
              <span>{t('orders.detail.total')}</span>
              <span className="tabular-nums">{formatCurrency(order.total, lang)}</span>
            </div>
            {/* Separator per Anatomy A.21 */}
            <Separator />
            <div className="pt-3">
              <h3 className="text-xs uppercase tracking-wide text-default-500">
                {t('orders.detail.paymentMethod')}
              </h3>
              <p className="mt-1 text-sm font-medium">
                {isAr ? order.paymentMethodNameAr : order.paymentMethodNameEn}
              </p>
            </div>
            {/* Separator per Anatomy A.21 */}
            <Separator />
            <div className="pt-3">
              <h3 className="text-xs uppercase tracking-wide text-default-500">
                {t('orders.detail.timeline')}
              </h3>
              <div className="mt-2">
                <OrderTimeline order={order} />
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </section>
  );
}
