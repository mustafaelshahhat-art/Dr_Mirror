import { Button, Spinner } from '@heroui/react';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ALL_ROLES, type AdminUserDto, type UserRole } from './users/types';
import { useAdminUsersQuery, useUpdateUserRolesMutation } from './users/hooks';

/**
 * Admin user management page at <c>/admin/users</c>.
 *   - Search by name or email
 *   - Role badge list per user
 *   - Inline role toggle: click a role button to add/remove it
 */
export function AdminUsersPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = useAdminUsersQuery(debouncedQ || undefined);

  function handleSearch(value: string) {
    setQ(value);
    const trimmed = value.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setDebouncedQ(trimmed);
    }, 300);
  }

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

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-default-400" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('admin.users.searchPlaceholder')}
          className="w-full rounded-medium border border-divider bg-content1 py-2 ps-9 pe-3 text-sm text-foreground transition-colors placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Spinner aria-label={t('admin.users.loading')} />
        </div>
      ) : query.data?.length ? (
        <div className="overflow-hidden rounded-large border border-divider/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider/60 bg-content2 text-start">
                <th className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-500">
                  {t('admin.users.colName')}
                </th>
                <th className="hidden px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-500 sm:table-cell">
                  {t('admin.users.colJoined')}
                </th>
                <th className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-500">
                  {t('admin.users.colRoles')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/40">
              {query.data.map((user) => (
                <UserRow key={user.id} user={user} dateFmt={dateFmt} />
              ))}
            </tbody>
          </table>
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
  const { t } = useTranslation();
  const updateRoles = useUpdateUserRolesMutation();
  const [pending, setPending] = useState(false);

  async function toggleRole(role: UserRole) {
    if (pending) return;
    const has = user.roles.includes(role);
    const next = has ? user.roles.filter((r) => r !== role) : [...user.roles, role];
    setPending(true);
    try {
      await updateRoles.mutateAsync({ userId: user.id, body: { roles: next } });
    } finally {
      setPending(false);
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
        <div className="flex flex-wrap gap-1.5">
          {ALL_ROLES.map((role) => {
            const active = user.roles.includes(role);
            return (
              <Button
                key={role}
                type="button"
                size="sm"
                variant={active ? 'solid' : 'ghost'}
                isDisabled={pending}
                onPress={() => toggleRole(role)}
                aria-label={
                  active
                    ? t('admin.users.removeRole', { role })
                    : t('admin.users.addRole', { role })
                }
                className={
                  active
                    ? 'h-6 min-w-0 rounded-full px-2.5 text-xs'
                    : 'h-6 min-w-0 rounded-full border border-divider px-2.5 text-xs text-default-500'
                }
              >
                {role}
              </Button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
