import { Pagination } from '@heroui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  isDisabled?: boolean;
  className?: string;
}

/**
 * Adapter shim that preserves the existing `PaginationControls` public API
 * (`page` / `totalPages` / `onPageChange`) while delegating rendering to
 * HeroUI v3's `Pagination` compound primitive. Public props MUST NOT change
 * because six consumers across the app depend on them unchanged.
 *
   * HeroUI v3's Pagination is a compound (Root + Previous + Content + Items +
   * Links + Ellipsis + Next), not a flat `page`/`total`/`onChange` widget.
 * This shim does the composition + page-window computation internally so
 * each call site stays a single self-contained line.
 */
export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  isDisabled,
  className,
}: Props) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const pages = getPaginationWindow(page, totalPages);
  const canGoPrev = page > 1 && !isDisabled;
  const canGoNext = page < totalPages && !isDisabled;

  return (
    <Pagination className={className}>
      <Pagination.Previous
        onPress={() => onPageChange(page - 1)}
        isDisabled={!canGoPrev}
        aria-label={t('common.pagination.prev')}
      >
        <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
      </Pagination.Previous>
      <Pagination.Content>
        {pages.map((entry, idx) =>
          entry === 'ellipsis' ? (
            <Pagination.Item key={`ellipsis-${idx}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={entry}>
              <Pagination.Link
                isActive={entry === page}
                isDisabled={isDisabled}
                onPress={() => onPageChange(entry)}
                aria-label={t('common.pagination.pageOf', {
                  page: entry,
                  totalPages,
                })}
                className="tabular-nums"
              >
                {entry}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}
      </Pagination.Content>
      <Pagination.Next
        onPress={() => onPageChange(page + 1)}
        isDisabled={!canGoNext}
        aria-label={t('common.pagination.next')}
      >
        <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
      </Pagination.Next>
    </Pagination>
  );
}

/**
 * Compute the visible page window with 1 sibling on each side of the active
 * page, plus first/last anchors and ellipsis where there are gaps. Keeps the
 * control compact for moderate page counts; identical heuristic to react-aria
 * / HeroUI v2 defaults so the visual result matches operator expectations.
 */
function getPaginationWindow(
  current: number,
  total: number,
): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const siblings = 1;
  const first = 1;
  const last = total;
  const left = Math.max(current - siblings, first);
  const right = Math.min(current + siblings, last);
  const showLeftEllipsis = left > first + 1;
  const showRightEllipsis = right < last - 1;
  const items: Array<number | 'ellipsis'> = [first];
  if (showLeftEllipsis) items.push('ellipsis');
  else for (let p = first + 1; p < left; p += 1) items.push(p);
  for (let p = left; p <= right; p += 1) {
    if (p !== first && p !== last) items.push(p);
  }
  if (showRightEllipsis) items.push('ellipsis');
  else for (let p = right + 1; p < last; p += 1) items.push(p);
  items.push(last);
  return items;
}
