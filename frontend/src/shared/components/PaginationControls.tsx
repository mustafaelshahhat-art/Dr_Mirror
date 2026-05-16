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
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={t('common.pagination.prev')}
        className="inline-flex items-center gap-1 rounded-medium border border-divider/60 px-3 py-1.5 text-xs font-medium text-default-600 transition-colors hover:bg-content2 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
        {t('common.pagination.prev')}
      </button>
      <span className="tabular-nums text-default-500">
        {t('common.pagination.pageOf', { page, totalPages })}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t('common.pagination.next')}
        className="inline-flex items-center gap-1 rounded-medium border border-divider/60 px-3 py-1.5 text-xs font-medium text-default-600 transition-colors hover:bg-content2 disabled:pointer-events-none disabled:opacity-40"
      >
        {t('common.pagination.next')}
        <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
      </button>
    </div>
  );
}
