import { Outlet } from 'react-router-dom';

import { ForbiddenBanner } from './ForbiddenBanner';
import { Header } from './Header';

/**
 * Global app shell — Header + outlet for route content. Consistent gutter
 * scale per DESIGN_PRINCIPLES §2 (px-4 / md:px-6 / lg:px-8). One container,
 * no nested cards.
 */
export function Layout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <ForbiddenBanner />
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-divider/40 py-6 text-center text-xs text-muted">
        Dr. Mirror &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
