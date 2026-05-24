import { Button, Card } from '@heroui/react';
import { ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import { useCancelReturnMutation } from '../hooks';
import { RETURN_STATUSES, type ReturnRequestDto } from '../types';

import { ReturnStatusBadge } from './ReturnStatusBadge';

export function ReturnRequestCard({
  orderNumber,
  request,
  lang,
  canCancel = true,
}: {
  orderNumber: string;
  request: ReturnRequestDto;
  lang: AppLang;
  canCancel?: boolean;
}) {
  const { t } = useTranslation();
  const cancelMutation = useCancelReturnMutation(orderNumber);
  const isAr = lang === 'ar';

  return (
    <Card>
      <Card.Content className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <ReturnStatusBadge status={request.status} />
            <p className="text-sm text-default-700 dark:text-default-300">{request.customerReason}</p>
            {request.adminNote ? (
              <p className="rounded-medium bg-content2 px-3 py-2 text-xs text-default-600">
                {request.adminNote}
              </p>
            ) : null}
          </div>
          {canCancel && request.status === RETURN_STATUSES.Requested ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              isPending={cancelMutation.isPending}
              isDisabled={cancelMutation.isPending}
              onPress={() => cancelMutation.mutate(request.id)}
            >
              {t('returns.actions.cancel')}
            </Button>
          ) : null}
        </div>

        <ul className="space-y-2">
          {request.items.map((item) => {
            const name = isAr ? item.nameAr : item.nameEn;
            const colorName = isAr ? item.colorNameAr : item.colorName;
            return (
              <li key={item.id} className="flex gap-3 rounded-medium border border-divider/60 bg-content2 p-2">
                <div className="size-14 shrink-0 overflow-hidden rounded-medium bg-default-100">
                  {item.primaryImageUrl ? (
                    <img src={item.primaryImageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-default-400" role="img" aria-label={t('catalog.detail.noImage')}>
                      <ImageOff className="size-4" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="line-clamp-1 font-medium text-foreground">{name}</p>
                  <p className="text-xs text-default-500">
                    {colorName} · {item.size} · {t('common.quantityMultiplier', { count: item.quantity })}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(item.unitPrice * item.quantity, lang)}
                </span>
              </li>
            );
          })}
        </ul>
      </Card.Content>
    </Card>
  );
}
