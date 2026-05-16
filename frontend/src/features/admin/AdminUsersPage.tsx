import { Spinner } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchInput } from '../catalog/components/SearchInput';
import { PaginationControls } from '../../shared/components/PaginationControls';
import type { AdminUserDto } from './users/types';
import { useAdminUsersQuery } from './users/hooks';
import { QueryErrorState } from './components/QueryErrorState';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const query = useAdminUsersQuery(q.trim() || undefined, page);

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    numberingSystem: 'latn',
  });

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.users.title')}</h1>
        <p className="text-sm text-default-500">{t('admin.users.subtitle')}</p>
      </header>

      <div className="max-w-sm">
        <SearchInput
          value={q}
          onCommit={(val) => { setQ(val); setPage(1); }}
        />
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Spinner aria-label={t('admin.users.loading')} />
        </div>
      ) : query.isError ? (
        <QueryErrorState
          message={t('admin.users.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items?.length ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-large border border-divider/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider/60 bg-content2 text-start">
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-500">
                    {t('admin.users.colName')}
                  </th>
                  <th scope="col" className="hidden px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-500 sm:table-cell">
                    {t('admin.users.colJoined')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-500">
                    {t('admin.users.colRoles')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/40">
                {query.data.items.map((user) => (
                  <UserRow key={user.id} user={user} dateFmt={dateFmt} />
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={page}
            totalPages={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
          {t('admin.users.empty')}
        </div>
      )}
    </section>
  );
}

function UserRow({
  user,
  dateFmt,
}: {
  user: AdminUserDto;
  dateFmt: Intl.DateTimeFormat;
}) {
  return (
    <tr className="bg-content1 transition-colors hover:bg-content2">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{user.fullName}</p>
        <p className="text-xs text-default-500" dir="ltr">{user.email}</p>
      </td>
      <td className="hidden px-4 py-3 tabular-nums text-default-500 sm:table-cell">
        {dateFmt.format(new Date(user.createdAt))}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {user.roles.map((role) => (
            <span
              key={role}
              className="inline-flex h-6 items-center rounded-full border border-divider bg-content2 px-2.5 text-xs font-medium text-default-700 dark:text-default-300"
            >
              {role}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}
