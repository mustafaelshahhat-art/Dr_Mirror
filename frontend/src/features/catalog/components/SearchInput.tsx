import { Button, Input } from '@heroui/react';
import { Search, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useState } from 'react';
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
 * onCommit callback fires `debounceMs` after the user stops typing, or
 * immediately when the user presses Enter.
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

  // Immediate commit on Enter — no waiting for the debounce.
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(draft);
    }
  }

  function handleClear() {
    setDraft('');
    onCommit('');
  }

  return (
    <div className="relative w-full">
      <Search
        aria-hidden
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-default-400"
      />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        placeholder={t('catalog.search.placeholder')}
        aria-label={t('catalog.search.label')}
        className="ps-9 pe-10"
      />
      {draft.length > 0 ? (
        /* Touch target: size-8 button keeps the icon small but expands the hit area
           to ~32px — combined with the input's padding this meets mobile expectations. */
        <Button
          type="button"
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label={t('catalog.search.clear')}
          onPress={handleClear}
          className="absolute end-1 top-1/2 size-8 min-w-0 -translate-y-1/2 text-default-500 hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
