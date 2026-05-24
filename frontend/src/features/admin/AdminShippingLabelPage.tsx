import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { adminOrdersApi } from './api';

import { formatCurrency, formatDate } from '../../shared/lib/format';
import { queryKeys } from '../../shared/lib/query-keys';
import type { AppLang } from '../../shared/lib/theme-storage';

export function AdminShippingLabelPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const query = useQuery({
    queryKey: queryKeys.admin.orders.detail(orderNumber ?? ''),
    queryFn: () => adminOrdersApi.get(orderNumber!),
    enabled: Boolean(orderNumber),
  });

  useEffect(() => {
    if (query.isSuccess) {
      window.print();
    }
  }, [query.isSuccess]);

  if (query.isLoading) return <LabelLoadingState />;
  if (query.isError || !query.data) return <LabelErrorState />;

  const order = query.data;
  const address = order.shippingAddress;
  const addressLines = [
    address.streetAddress,
    [address.apartment ? `${t('admin.shippingLabel.apartment')}: ${address.apartment}` : null,
      address.floor ? `${t('admin.shippingLabel.floor')}: ${address.floor}` : null]
      .filter(Boolean)
      .join(' - '),
    `${address.city}, ${t(`governorates.${address.governorate}`, address.governorate)}`,
    address.landmark ? `${t('admin.shippingLabel.landmark')}: ${address.landmark}` : null,
    address.notes ? `${t('admin.shippingLabel.notes')}: ${address.notes}` : null,
  ].filter(Boolean);

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} className="label-page">
      <LabelStyles />

      <header className="label-header">
        <div>
          <p className="store-name">{t('admin.shippingLabel.storeName')}</p>
          <p className="label-muted">{t('admin.shippingLabel.address')}</p>
        </div>
        <div className="label-stamp">{order.orderNumber}</div>
      </header>

      <div className="label-grid">
        <section className="label-section">
          <h2>{t('admin.shippingLabel.orderInfo')}</h2>
          <LabelRow label={t('admin.shippingLabel.orderNumber')} value={order.orderNumber} />
          <LabelRow label={t('admin.shippingLabel.orderDate')} value={formatDate(order.createdAt, lang, 'YYYY-MM-DD HH:mm')} />
          <LabelRow label={t('admin.shippingLabel.paymentMethod')} value={isAr ? order.paymentMethodNameAr : order.paymentMethodNameEn} />
          <LabelRow label={t('admin.shippingLabel.paymentStatus')} value={t(`admin.paymentStatus.${order.paymentStatusLabel}`)} />
        </section>

        <section className="label-section">
          <h2>{t('admin.shippingLabel.customerInfo')}</h2>
          <LabelRow label={t('common.account.fields.fullName')} value={order.buyer.fullName} />
          <LabelRow label={t('admin.shippingLabel.phone')} value={address.phone} />
          {order.buyer.email ? <LabelRow label={t('common.account.fields.email')} value={order.buyer.email} /> : null}
        </section>
      </div>

      <section className="label-section">
        <h2>{t('admin.shippingLabel.address')}</h2>
        <p className="address-recipient">{address.recipientName}</p>
        {addressLines.map((line, index) => (
          <p key={`${index}-${line}`} className="address-line">{line}</p>
        ))}
      </section>

      <section className="label-section">
        <h2>{t('admin.shippingLabel.items')}</h2>
        <table>
          <thead>
            <tr>
              <th>{t('admin.shippingLabel.itemName')}</th>
              <th>{t('admin.shippingLabel.sku')}</th>
              <th>{t('admin.shippingLabel.size')}</th>
              <th>{t('admin.shippingLabel.color')}</th>
              <th>{t('admin.shippingLabel.quantity')}</th>
              <th>{t('admin.shippingLabel.unitPrice')}</th>
              <th>{t('admin.shippingLabel.lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{isAr ? item.nameAr : item.nameEn}</td>
                <td>{item.sku}</td>
                <td>{item.size}</td>
                <td>{isAr ? item.colorNameAr : item.colorName}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice, lang)}</td>
                <td>{formatCurrency(item.lineTotal, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="label-section totals-section">
        <h2>{t('admin.shippingLabel.totals')}</h2>
        <LabelRow label={t('admin.shippingLabel.subTotal')} value={formatCurrency(order.subTotal, lang)} />
        <LabelRow label={t('admin.shippingLabel.shipping')} value={formatCurrency(order.shippingFee, lang)} />
        <LabelRow label={t('admin.shippingLabel.total')} value={formatCurrency(order.total, lang)} strong />
      </section>

      {order.buyerNote ? (
        <section className="label-section">
          <h2>{t('admin.shippingLabel.buyerNote')}</h2>
          <p>{order.buyerNote}</p>
        </section>
      ) : null}

      <section className="label-section notes-box">
        <h2>{t('admin.shippingLabel.shippingNotes')}</h2>
      </section>

      <footer className="signature-line">
        <span>{t('admin.shippingLabel.signature')}</span>
      </footer>
    </main>
  );
}

function LabelLoadingState() {
  const { t } = useTranslation();
  return <div className="no-print label-state">{t('admin.shippingLabel.loading')}</div>;
}

function LabelErrorState() {
  const { t } = useTranslation();
  return <div className="no-print label-state">{t('admin.shippingLabel.errorLoad')}</div>;
}

function LabelRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="label-row">
      <span>{label}</span>
      <span className={strong ? 'strong' : undefined}>{value}</span>
    </div>
  );
}

function LabelStyles() {
  return (
    <style>{`
      @media print {
        body { background: white; }
        .no-print { display: none !important; }
        .label-page { box-shadow: none; margin: 0; max-width: none; padding: 0; }
      }

      @media screen {
        body { background: #f5f5f5; }
        .label-page {
          background: white;
          box-shadow: 0 12px 40px rgb(0 0 0 / 12%);
          margin: 2rem auto;
          max-width: 210mm;
          padding: 20mm;
        }
      }

      .label-page {
        color: #111827;
        font-family: Alexandria, Satoshi, Arial, sans-serif;
        font-size: 12px;
        line-height: 1.5;
      }

      .label-header,
      .label-grid,
      .label-row,
      .signature-line {
        display: flex;
        gap: 16px;
        justify-content: space-between;
      }

      .label-header {
        align-items: flex-start;
        border-bottom: 2px solid #111827;
        margin-bottom: 18px;
        padding-bottom: 14px;
      }

      .store-name { font-size: 24px; font-weight: 800; margin: 0; }
      .label-muted { color: #4b5563; margin: 2px 0 0; }
      .label-stamp { border: 2px solid #111827; font-size: 18px; font-weight: 800; padding: 8px 12px; }
      .label-grid { align-items: stretch; }
      .label-grid .label-section { flex: 1; }

      .label-section {
        border: 1px solid #d1d5db;
        margin-bottom: 14px;
        padding: 12px;
      }

      .label-section h2 {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .04em;
        margin: 0 0 8px;
        text-transform: uppercase;
      }

      .label-row { border-top: 1px solid #e5e7eb; padding: 5px 0; }
      .label-row:first-of-type { border-top: 0; }
      .label-row span:first-child { color: #4b5563; }
      .label-row span:last-child { font-weight: 600; margin: 0; text-align: end; }
      .label-row span.strong { font-size: 15px; font-weight: 900; }
      .address-recipient { font-size: 15px; font-weight: 800; margin: 0 0 4px; }
      .address-line { margin: 2px 0; }

      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 6px; text-align: start; vertical-align: top; }
      th { background: #f3f4f6; font-size: 11px; font-weight: 800; }
      .totals-section { margin-inline-start: auto; max-width: 90mm; }
      .notes-box { min-height: 32mm; }
      .signature-line { border-top: 1px solid #111827; margin-top: 28mm; padding-top: 8px; }
    `}</style>
  );
}
