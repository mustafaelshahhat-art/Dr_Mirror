import { Button, Switch, Tooltip } from '@heroui/react';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { type PaymentMethodKind } from '../../../../orders/types';
import type { AdminPaymentMethodDto } from '../../types';

const KIND_LABEL_KEY: Record<PaymentMethodKind, string> = {
  0: 'admin.payments.kind.cod',
  1: 'admin.payments.kind.instapay',
  2: 'admin.payments.kind.wallet',
  3: 'admin.payments.kind.bankTransfer',
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

  return (
    <div className="content-surface p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              {isAr ? method.nameAr : method.nameEn}
            </span>
            <span className="font-mono text-xs text-default-500">{method.code}</span>
            <span className="text-xs text-default-500">·</span>
            <span className="text-xs text-default-500">{t(KIND_LABEL_KEY[method.kind])}</span>
            <span
              className={[
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
                method.isActive
                  ? 'border-success/30 bg-success/15 text-success'
                  : 'border-divider/60 bg-content2 text-default-500',
              ].join(' ')}
            >
              {method.isActive
                ? t('admin.catalog.status.active')
                : t('admin.catalog.status.inactive')}
            </span>
          </div>
          {method.accountNumber ? (
            <p className="font-mono text-xs text-default-500" dir="ltr">
              {method.accountNumber}
              {method.accountHolder ? ` · ${method.accountHolder}` : ''}
            </p>
          ) : null}
          <p className="text-xs text-default-500">
            {t('admin.payments.orderCount', { count: method.orderCount })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip delay={300} closeDelay={0}>
            <Button
              isIconOnly
              variant="ghost"
              size="md"
              onPress={onEdit}
              aria-label={t('admin.catalog.actions.edit')}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Tooltip.Content placement="top">{t('admin.catalog.actions.edit')}</Tooltip.Content>
          </Tooltip>
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
    </div>
  );
}
