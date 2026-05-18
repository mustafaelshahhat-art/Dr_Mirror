import { useEffect, useState } from 'react';

import { subscribeToAnnouncements } from '../lib/live-announcer';

/**
 * Single shared aria-live region. Render exactly one instance per app shell
 * (storefront Layout + AdminLayout) — additional regions would multiply
 * announcements. Feature code emits via announce() from
 * shared/lib/live-announcer.
 */
export function LiveRegion() {
  const [entry, setEntry] = useState<{ id: number; text: string }>({ id: 0, text: '' });

  useEffect(() => {
    let counter = 0;
    return subscribeToAnnouncements((next) => {
      counter += 1;
      setEntry({ id: counter, text: next });
    });
  }, []);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
      <span key={entry.id}>{entry.text}</span>
    </div>
  );
}
