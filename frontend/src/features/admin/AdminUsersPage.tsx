import { Switch, Tooltip } from '@heroui/react';
import { isAxiosError } from 'axios';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../auth/types';
import { SearchInput } from '../catalog/components/SearchInput';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { TableRowSkeleton } from '../../shared/components/Skeleton';
import { ALL_ROLES, type AdminUserDto, type UserRole } from './users/types';
import { useAdminUsersQuery, useUpdateUserRolesMutation } from './users/hooks';
import { QueryErrorState } from '../../shared/components/QueryErrorState';

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
        <div
          className="overflow-hidden rounded-large border border-divider/60"
          aria-busy="true"
          aria-label={t('admin.users.loading')}
        >
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={3} />
              ))}
            </tbody>
          </table>
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
            <table className="w-full text-sm" aria-busy={query.isFetching}>
              <thead>
                <tr className="border-b border-divider/60 bg-content2 text-start">
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.users.colName')}
                  </th>
                  <th scope="col" className="hidden px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400 sm:table-cell">
                    {t('admin.users.colJoined')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.users.colRoles')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
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
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <Users className="enter-fade-up mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="enter-fade-up text-sm text-default-500">{t('admin.users.empty')}</p>
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
  const { t } = useTranslation();
  const updateRoles = useUpdateUserRolesMutation();
  const [error, setError] = useState<string | null>(null);

  async function toggleRole(role: UserRole, enabled: boolean) {
    setError(null);
    const nextRoles = enabled
      ? [...user.roles, role]
      : user.roles.filter((current) => current !== role);

    try {
      await updateRoles.mutateAsync({
        userId: user.id,
        roles: ALL_ROLES.filter((candidate) => nextRoles.includes(candidate)),
      });
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setError(problem?.detail ?? problem?.title ?? t('admin.users.roles.errorUnknown'));
    }
  }

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
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => {
              const label = t('admin.users.roles.toggle', {
                role: t(`admin.users.roles.names.${role}`),
                name: user.fullName,
              });
              return (
                <Tooltip key={role} delay={300} closeDelay={0}>
                  <Switch
                    size="sm"
                    isSelected={user.roles.includes(role)}
                    isDisabled={updateRoles.isPending}
                    onChange={(enabled) => void toggleRole(role, enabled)}
                    className="items-center gap-1.5"
                    aria-label={label}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Content className="text-xs font-medium">
                      {t(`admin.users.roles.names.${role}`)}
                    </Switch.Content>
                  </Switch>
                  <Tooltip.Content placement="top">{label}</Tooltip.Content>
                </Tooltip>
              );
            })}
          </div>
          {error ? (
            <p role="alert" className="max-w-md text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
