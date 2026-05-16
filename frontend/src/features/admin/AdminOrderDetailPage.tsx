import { Spinner } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { OrderStatusBadge } from '../orders/components/OrderStatusBadge';
import { OrderTimeline } from '../orders/components/OrderTimeline';
import { PAYMENT_METHOD_KIND } from '../orders/types';

import { AdminProofReview } from './components/AdminProofReview';
import { AdminTransitionActions } from './components/AdminTransitionActions';
import { useAdminOrderQuery } from './hooks';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';

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
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner aria-label={t('admin.detail.loading')} />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    return (
      <div className="space-y-3 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">
          {isNotFound ? t('admin.detail.notFoundTitle') : t('admin.detail.errorTitle')}
        </h1>
        <p className="text-sm text-default-500">
          {isNotFound
            ? t('admin.detail.notFoundSubtitle')
            : t('admin.detail.errorSubtitle')}
        </p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center justify-center rounded-medium bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t('admin.detail.backToList')}
        </Link>
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
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <p className="text-sm text-default-500">
            {t('admin.detail.subtitle', {
              count: order.items.length,
              total: formatCurrency(order.total, lang),
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <article className="rounded-large border border-primary/30 bg-primary/5 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">
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

          {isNonCod ? (
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
          ) : null}

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
                        <div className="flex h-full w-full items-center justify-center text-default-400">
                          —
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
                        <span>×{item.quantity}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-default-400">
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
                &ldquo;{order.buyerNote}&rdquo;
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
          <div className="border-t border-divider/60 pt-3">
            <h3 className="text-xs uppercase tracking-wide text-default-500">
              {t('admin.detail.timeline')}
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
