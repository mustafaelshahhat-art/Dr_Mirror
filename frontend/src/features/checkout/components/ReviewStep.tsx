import { MapPin, CreditCard, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { PaymentMethodDto } from '../../orders/types';
import { formatCurrency } from '../../../shared/lib/format';

export interface ReviewAddress {
  recipientName: string;
  phone: string;
  streetAddress: string;
  apartment?: string | null;
  floor?: string | null;
  city: string;
  governorate: string;
}

interface Props {
  reviewAddress: ReviewAddress | undefined;
  selectedMethod: PaymentMethodDto | undefined;
  buyerNote: string | undefined;
  isAr: boolean;
  subTotal?: number;
  shippingFee?: number;
}

export function ReviewStep({ reviewAddress, selectedMethod, buyerNote, isAr, subTotal = 0, shippingFee = 0 }: Props) {
  const { t } = useTranslation();
  const lang = isAr ? 'ar' : 'en';
  const total = subTotal + shippingFee;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
        {t('checkout.review.heading')}
      </legend>
      <article className="overflow-hidden rounded-2xl border border-separator/60 bg-surface p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/15">
            <MapPin className="size-3.5 text-brand" aria-hidden />
          </span>
          {t('checkout.review.shippingTo')}
        </h3>
        <p className="mt-2 ps-9 text-sm leading-relaxed">
          {reviewAddress?.recipientName}
          <br />
          <span dir="ltr">{reviewAddress?.phone}</span>
          <br />
          {reviewAddress?.streetAddress}
          {reviewAddress?.apartment
            ? `, ${t('checkout.address.apartmentShort')} ${reviewAddress.apartment}`
            : ''}
          {reviewAddress?.floor
            ? `, ${t('checkout.address.floorShort')} ${reviewAddress.floor}`
            : ''}
          <br />
          {reviewAddress?.city},{' '}
          {t(
            `governorates.${reviewAddress?.governorate}`,
            reviewAddress?.governorate ?? '',
          )}
        </p>
      </article>
      <article className="overflow-hidden rounded-2xl border border-separator/60 bg-surface p-4">
        <h3 className="font-semibold">{t('checkout.summary.heading')}</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-strong">{t('shipping.breakdown.subtotal')}</dt>
            <dd className="tabular-nums">{formatCurrency(subTotal, lang)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-strong">{t('shipping.breakdown.shippingFee')}</dt>
            <dd className="tabular-nums">{formatCurrency(shippingFee, lang)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-separator/60 pt-2 font-semibold">
            <dt>{t('shipping.breakdown.total')}</dt>
            <dd className="tabular-nums">{formatCurrency(total, lang)}</dd>
          </div>
        </dl>
      </article>
      <article className="overflow-hidden rounded-2xl border border-separator/60 bg-surface p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/15">
            <CreditCard className="size-3.5 text-brand" aria-hidden />
          </span>
          {t('checkout.review.payingWith')}
        </h3>
        <p className="mt-2 ps-9 text-sm">
          {selectedMethod
            ? isAr
              ? selectedMethod.nameAr
              : selectedMethod.nameEn
            : t('checkout.review.noMethod')}
        </p>
      </article>
      {buyerNote?.trim() ? (
        <article className="overflow-hidden rounded-2xl border border-separator/60 bg-surface p-4 text-sm italic text-default-700 dark:text-default-300">
          <h3 className="flex items-center gap-2 not-italic font-semibold">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/15">
              <MessageSquare className="size-3.5 text-brand" aria-hidden />
            </span>
            {t('checkout.buyerNote.label')}
          </h3>
          <p className="mt-2 ps-9">
            {t('checkout.review.buyerNoteQuoted', { note: buyerNote })}
          </p>
        </article>
      ) : null}
    </fieldset>
  );
}
