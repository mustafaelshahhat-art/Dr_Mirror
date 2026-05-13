import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Minimal previous/next pager + "page X of Y / N results" status text.
 * No fancy page-number list — for ~100 items it's overkill and visually noisy.
 */
export function PaginationBar({ page, totalPages, totalCount, onPageChange }: PaginationBarProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return (
      <p className="text-center text-xs text-default-500">
        {t('catalog.pagination.results', { count: totalCount })}
      </p>
    );
  }

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
      aria-label={t('catalog.pagination.label')}
    >
      <p className="text-xs text-default-500 tabular-nums">
        {t('catalog.pagination.pageOf', { page, total: totalPages })}{' · '}
        {t('catalog.pagination.results', { count: totalCount })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={() => onPageChange(page - 1)}
          isDisabled={page <= 1}
        >
          {t('catalog.pagination.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onPress={() => onPageChange(page + 1)}
          isDisabled={page >= totalPages}
        >
          {t('catalog.pagination.next')}
        </Button>
      </div>
    </nav>
  );
}
