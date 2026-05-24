import { Switch, Tooltip } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { StatusPill } from '../../../../../shared/components/StatusPill';

import type { AdminPaymentMethodDto } from '../../types';

const KIND_LABEL_KEY: Record<string, string> = {
  0: 'admin.payments.kind.cod',
  1: 'admin.payments.kind.instapay',
  2: 'admin.payments.kind.wallet',
  3: 'admin.payments.kind.bankTransfer',
  Cod: 'admin.payments.kind.cod',
  Instapay: 'admin.payments.kind.instapay',
  Wallet: 'admin.payments.kind.wallet',
  BankTransfer: 'admin.payments.kind.bankTransfer',
};

interface Props {
  method: AdminPaymentMethodDto;
  isAr: boolean;
  isToggling: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}

/**
 * Display row for a single payment method, with edit + toggle-active buttons.
 * Toggle mutation state is owned by the parent so list-level errors surface
 * in one place.
 */
export function PaymentMethodRow({
  method,
  isAr,
  isToggling,
  onEdit,
  onToggleActive,
}: Props) {
  const { t } = useTranslation();

  const kindKey = KIND_LABEL_KEY[String(method.kind)];

  return (
    <div className="content-surface flex flex-row items-start justify-between gap-3 p-3">
      <button
        type="button"
        className="min-w-0 flex-1 space-y-1 text-start"
        onClick={onEdit}
        aria-label={`${t('admin.catalog.actions.edit')}: ${isAr ? method.nameAr : method.nameEn}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">
            {isAr ? method.nameAr : method.nameEn}
          </span>
          {!isAr && (
            <>
              <span className="font-mono text-xs text-default-500">{method.code}</span>
              <span className="text-xs text-default-500">·</span>
              {kindKey ? <span className="text-xs text-default-500">{t(kindKey)}</span> : null}
            </>
          )}
          <StatusPill active={method.isActive} />
        </div>
        {method.accountNumber ? (
          <p className="font-mono text-xs text-default-500">
            <span dir="ltr">
              {method.accountNumber}
              {method.accountHolder ? ` · ${method.accountHolder}` : ''}
            </span>
          </p>
        ) : null}
        <p className="text-xs text-default-500">
          {t('admin.payments.orderCount', { count: method.orderCount })}
        </p>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Tooltip delay={300} closeDelay={0}>
          <Switch
            size="sm"
            isSelected={method.isActive}
            isDisabled={isToggling}
            onChange={onToggleActive}
            aria-label={
              method.isActive
                ? t('admin.catalog.actions.deactivate')
                : t('admin.catalog.actions.activate')
            }
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
          <Tooltip.Content placement="top">
            {method.isActive
              ? t('admin.catalog.actions.deactivate')
              : t('admin.catalog.actions.activate')}
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}
