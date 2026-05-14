import { Input } from '@heroui/react';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchInputProps {
  value: string;
  onCommit: (next: string) => void;
  /** Debounce window in ms before committing the value. Default 350. */
  debounceMs?: number;
}

/**
 * Debounced search box. The internal state mirrors the URL on first render
 * (so refreshes preserve the typed query) and on every external change. The
 * onCommit callback fires `debounceMs` after the user stops typing.
 */
export function SearchInput({ value, onCommit, debounceMs = 350 }: SearchInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);

  // External resets (e.g. clearing filters) should refill the box.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDraft(value); }, [value]);

  // Debounced commit.
  useEffect(() => {
    if (draft === value) return;
    const handle = window.setTimeout(() => onCommit(draft), debounceMs);
    return () => window.clearTimeout(handle);
  }, [draft, value, onCommit, debounceMs]);

  return (
    <div className="relative w-full">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-default-400 ltr:left-3 rtl:right-3"
      />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
        placeholder={t('catalog.search.placeholder')}
        aria-label={t('catalog.search.label')}
        className="ps-9 pe-9"
      />
      {draft.length > 0 ? (
        <button
          type="button"
          aria-label={t('catalog.search.clear')}
          onClick={() => {
            setDraft('');
            onCommit('');
          }}
          className="absolute top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-default-500 hover:bg-default-100 hover:text-foreground ltr:right-2 rtl:left-2"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
