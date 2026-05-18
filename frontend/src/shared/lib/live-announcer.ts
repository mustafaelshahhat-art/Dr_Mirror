/**
 * Module-level pub/sub for polite-priority a11y announcements. The single
 * shared <LiveRegion /> per app shell subscribes; feature code calls
 * announce(). Splitting the function and the component into separate files
 * lets Fast Refresh keep the component file pure.
 */

export type LiveAnnouncerListener = (message: string) => void;

const listeners = new Set<LiveAnnouncerListener>();

export function announce(message: string): void {
  if (!message) return;
  for (const listener of listeners) {
    listener(message);
  }
}

export function subscribeToAnnouncements(listener: LiveAnnouncerListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
