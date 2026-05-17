import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { ForbiddenBanner } from '../../../shared/components/ForbiddenBanner';

export function AdminLayout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-medium focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t('common.a11y.skipToContent')}
      </a>
      <ForbiddenBanner />
      <AdminHeader onMenuPress={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main id="admin-main" tabIndex={-1} className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
