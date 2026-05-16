import { useTranslation } from 'react-i18next';

import type { PaymentMethodDto } from '../../orders/types';

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
}

export function ReviewStep({ reviewAddress, selectedMethod, buyerNote, isAr }: Props) {
  const { t } = useTranslation();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
        {t('checkout.review.heading')}
      </legend>
      <article className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm">
        <h3 className="font-semibold">{t('checkout.review.shippingTo')}</h3>
        <p className="mt-1 leading-relaxed">
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
      <article className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm">
        <h3 className="font-semibold">{t('checkout.review.payingWith')}</h3>
        <p className="mt-1">
          {selectedMethod
            ? isAr
              ? selectedMethod.nameAr
              : selectedMethod.nameEn
            : t('checkout.review.noMethod')}
        </p>
      </article>
      {buyerNote?.trim() ? (
        <article className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm italic text-default-700 dark:text-default-300">
          &ldquo;{buyerNote}&rdquo;
        </article>
      ) : null}
    </fieldset>
  );
}
