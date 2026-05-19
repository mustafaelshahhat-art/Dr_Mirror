import { Heading, Paragraph, Switch, Table, Tooltip } from '@heroui/react';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchInput } from '../catalog/components/SearchInput';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';
import { ALL_ROLES, type AdminUserDto, type UserRole } from './users/types';
import { useAdminUsersQuery, useUpdateUserRolesMutation } from './users/hooks';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { EmptyState } from '../../shared/components/EmptyState';

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
    <section className="space-y-8">
      <header className="space-y-1">
        <Heading className="text-2xl font-semibold tracking-tight">{t('admin.users.title')}</Heading>
        <Paragraph className="text-sm text-default-500">{t('admin.users.subtitle')}</Paragraph>
      </header>

      <div className="max-w-sm">
        <SearchInput
          value={q}
          onCommit={(val) => { setQ(val); setPage(1); }}
        />
      </div>

      {query.isLoading ? (
        <Table className="rounded-large border border-divider/60">
          <Table.ScrollContainer>
            <Table.Content aria-label={t('admin.users.loading')} aria-busy={true}>
              <TableSkeletonHeader cols={3} label={t('admin.users.loading')} />
              <Table.Body>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={3} />
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : query.isError ? (
        <QueryErrorState
          message={t('admin.users.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items?.length ? (
        <div className="space-y-4">
          <Table className="rounded-large border border-divider/60">
            <Table.ScrollContainer>
              <Table.Content aria-label={t('admin.users.title')} aria-busy={query.isFetching}>
                <Table.Header>
                  <Table.Column isRowHeader className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.users.colName')}
                  </Table.Column>
                  <Table.Column className="hidden px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400 sm:table-cell">
                    {t('admin.users.colJoined')}
                  </Table.Column>
                  <Table.Column className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.users.colRoles')}
                  </Table.Column>
                </Table.Header>
                <Table.Body className="divide-y divide-divider/60">
                  {query.data.items.map((user) => (
                    <UserRow key={user.id} user={user} dateFmt={dateFmt} />
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <PaginationControls
            page={page}
            totalPages={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState icon={Users} title={t('admin.users.empty')} />
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

  async function toggleRole(role: UserRole, enabled: boolean) {
    const nextRoles = enabled
      ? [...user.roles, role]
      : user.roles.filter((current) => current !== role);

    try {
      await updateRoles.mutateAsync({
        userId: user.id,
        roles: ALL_ROLES.filter((candidate) => nextRoles.includes(candidate)),
      });
    } catch {
      // Toast emitted by mutation onError.
    }
  }

  return (
    <Table.Row className="bg-content1 transition-colors hover:bg-content2">
      <Table.Cell className="px-4 py-3">
        <p className="font-medium text-foreground">{user.fullName}</p>
        <p className="text-xs text-default-500" dir="ltr">{user.email}</p>
      </Table.Cell>
      <Table.Cell className="hidden px-4 py-3 tabular-nums text-default-500 sm:table-cell">
        {dateFmt.format(new Date(user.createdAt))}
      </Table.Cell>
      <Table.Cell className="px-4 py-3">
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
        </div>
      </Table.Cell>
    </Table.Row>
  );
}
