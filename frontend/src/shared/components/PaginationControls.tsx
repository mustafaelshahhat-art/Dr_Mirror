import { Button } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function PaginationControls({ page, totalPages, onPageChange }: Props) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-2 text-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        isDisabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        aria-label={t('common.pagination.prev')}
      >
        <span className="inline-flex items-center gap-1">
          <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
          {t('common.pagination.prev')}
        </span>
      </Button>
      <span className="tabular-nums text-default-500">
        {t('common.pagination.pageOf', { page, totalPages })}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        isDisabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        aria-label={t('common.pagination.next')}
      >
        <span className="inline-flex items-center gap-1">
          {t('common.pagination.next')}
          <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
        </span>
      </Button>
    </div>
  );
}
