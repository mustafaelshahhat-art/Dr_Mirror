export const ADMIN_HEADER_HEIGHT = '3.5rem';
export const ADMIN_HEADER_HEIGHT_CLASS = 'h-14';
export const ADMIN_HEADER_OFFSET_CLASS = 'top-14';

/**
 * Height for the mobile admin drawer (backdrop + content), sized to the
 * viewport area *below* the sticky 3.5rem (`h-14`) header so the drawer's
 * internal flex column — scrollable nav body + pinned account/sign-out footer —
 * fits exactly on screen.
 *
 * MUST be a complete static string (no template interpolation) so Tailwind's
 * source scanner can extract it and emit the utility. `--visual-viewport-height`
 * is HeroUI's own drawer/modal sizing var; it is honoured when present (e.g.
 * when the on-screen keyboard shrinks the visual viewport) and falls back to
 * `100dvh` — the mobile-safe dynamic viewport unit — otherwise. Underscores are
 * Tailwind's spaces, yielding `calc(var(--visual-viewport-height,100dvh) - 3.5rem)`.
 */
export const ADMIN_DRAWER_HEIGHT_CLASS = 'h-[calc(var(--visual-viewport-height,100dvh)_-_3.5rem)]';
