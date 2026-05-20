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
    <div className="relative w-full group">
      {/* Search Icon */}
      <Search
        aria-hidden
        className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-default-400 group-hover:text-brand/70 group-focus-within:text-brand transition-colors duration-300 shrink-0"
      />
      
      {/* Input element */}
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        placeholder={t('catalog.search.placeholder')}
        aria-label={t('catalog.search.label')}
        className="w-full h-10 ps-10 pe-10 rounded-full border border-default-200/60 bg-default-100/30 dark:bg-default-50/10 text-sm text-default-700 dark:text-default-300 placeholder:text-default-400 font-semibold transition-all duration-300 hover:border-brand/40 hover:bg-brand/5 dark:hover:bg-brand/10 focus:border-brand/80 focus:outline-none focus:ring-2 focus:ring-brand/20"
      />

      {/* Clear Button */}
      {draft.length > 0 ? (
        <Button
          type="button"
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label={t('catalog.search.clear')}
          onPress={handleClear}
          className="absolute end-1 top-1/2 size-8 min-w-0 -translate-y-1/2 text-default-500 hover:text-foreground rounded-full transition-all duration-200 active:scale-90"
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
