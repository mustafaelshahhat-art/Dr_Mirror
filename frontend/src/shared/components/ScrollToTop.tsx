import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global scroll restoration for SPA navigation.
 *
 * React Router (unlike a full page load) preserves the window scroll position
 * across navigations, so a new page can open mid-scroll where the previous one
 * left off. This component resets the scroll position to the top on every
 * route change so each page starts at the top — for customer, admin, auth,
 * product, account, checkout, and cart routes alike.
 *
 * Detection of a "route change":
 *  - `pathname` — covers ordinary navigations (`/cart` → `/checkout`,
 *    `/products/:slug`, `/admin/orders`, …).
 *  - A small set of navigational query params (`tab`, `page`) — covers
 *    in-place page/tab changes that keep the same pathname, such as the
 *    account tabs (`/account?tab=orders`) and paginated listings
 *    (`?page=2`). Non-navigational params (catalog filters/sort/search)
 *    deliberately do NOT trigger a scroll, so refining filters in place
 *    stays put rather than janking back to the top.
 *
 * Hash anchors: if the URL carries a `#hash`, defer to anchor behavior and
 * scroll the target element into view (e.g. the skip-to-content link). Only
 * when there is no hash do we scroll to the top.
 *
 * Both app shells (customer `Layout`, `AdminLayout`) scroll the window/document
 * rather than an inner fixed-height container, so `window.scrollTo` is the
 * correct target on desktop and mobile. The scroll is instant (`behavior:
 * 'auto'`) to avoid jank and to keep back/forward navigation snappy.
 */

// Query params that, when changed, represent a page/tab change worth scrolling for.
const NAVIGATIONAL_PARAMS = ['tab', 'page'] as const;

function navigationalKey(search: string): string {
  const params = new URLSearchParams(search);
  return NAVIGATIONAL_PARAMS.map((key) => `${key}=${params.get(key) ?? ''}`).join('&');
}

export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const navKey = navigationalKey(search);

  useEffect(() => {
    if (hash) {
      // Honor anchor navigation: scroll the hash target into view, falling
      // back to the top when the element is not (yet) present.
      const id = decodeURIComponent(hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // navKey is derived from `search`; depending on it (not the full search
    // string) means only page/tab param changes re-run this effect.
  }, [pathname, navKey, hash]);

  return null;
}
