import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { ForbiddenBanner } from '../../../shared/components/ForbiddenBanner';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <ForbiddenBanner />
      <AdminHeader onMenuPress={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
