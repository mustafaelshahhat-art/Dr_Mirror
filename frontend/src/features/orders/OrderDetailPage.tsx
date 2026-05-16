import { Spinner } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';

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
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner aria-label={t('orders.detail.loading')} />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    return (
      <div className="space-y-3 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">
          {isNotFound ? t('orders.detail.notFoundTitle') : t('orders.detail.errorTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {isNotFound
            ? t('orders.detail.notFoundSubtitle')
            : t('orders.detail.errorSubtitle')}
        </p>
        <Link
          to="/account/orders"
          className="inline-flex items-center justify-center rounded-medium bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
    <section className="space-y-6">
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('orders.detail.backToList')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
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
            <PaymentProofsList proofs={order.paymentProofs} />
          ) : null}

          <section aria-labelledby="items-heading" className="space-y-2">
            <h2 id="items-heading" className="text-sm font-semibold text-foreground">
              {t('orders.detail.itemsHeading')}
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
                        <div className="flex h-full w-full items-center justify-center text-default-400">
                          —
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
                        <span>×{item.quantity}</span>
                      </p>
                      <p className="mt-0.5 text-xs font-mono uppercase tracking-wide text-default-400">
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

          <section aria-labelledby="address-heading" className="space-y-2">
            <h2 id="address-heading" className="text-sm font-semibold text-foreground">
              {t('orders.detail.shippingHeading')}
            </h2>
            <div className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm leading-relaxed">
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
            </div>
          </section>

          <CancelOrderButton order={order} />
        </div>

        <aside className="h-fit space-y-4 rounded-large border border-divider/60 bg-content1 p-4 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
            {t('orders.detail.summary')}
          </h2>
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
            <div className="flex justify-between border-t border-divider/60 pt-2 text-base font-semibold">
              <dt>{t('orders.detail.total')}</dt>
              <dd className="tabular-nums">{formatCurrency(order.total, lang)}</dd>
            </div>
          </dl>
          <div className="border-t border-divider/60 pt-3">
            <h3 className="text-xs uppercase tracking-wide text-default-500">
              {t('orders.detail.paymentMethod')}
            </h3>
            <p className="mt-1 text-sm font-medium">
              {isAr ? order.paymentMethodNameAr : order.paymentMethodNameEn}
            </p>
          </div>
          <div className="border-t border-divider/60 pt-3">
            <h3 className="text-xs uppercase tracking-wide text-default-500">
              {t('orders.detail.timeline')}
            </h3>
            <div className="mt-2">
              <OrderTimeline order={order} />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
