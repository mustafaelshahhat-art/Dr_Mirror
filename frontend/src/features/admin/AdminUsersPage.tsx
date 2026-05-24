import { Button, Chip, Table } from '@heroui/react';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchInput } from '../catalog/components/SearchInput';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';
import type { AdminUserDto } from './users/types';
import { useAdminUsersQuery, useDisableUserMutation, useEnableUserMutation } from './users/hooks';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { AdminUsersMobileCards } from './AdminUsersMobileCards';

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
      <header className="page-header">
        <h1 className="page-title">{t('admin.users.title')}</h1>
        <p className="page-subtitle">{t('admin.users.subtitle')}</p>
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
          <div className="hidden sm:block">
            <Table className="rounded-large border border-divider/60">
              <Table.ScrollContainer>
                <Table.Content aria-label={t('admin.users.title')} aria-busy={query.isFetching}>
                  <Table.Header>
                    <Table.Column isRowHeader className="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-default-500">
                      {t('admin.users.colName')}
                    </Table.Column>
                    <Table.Column className="hidden px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-default-500 sm:table-cell">
                      {t('admin.users.colJoined')}
                    </Table.Column>
                    <Table.Column className="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-default-500">
                      {t('admin.users.colStatus')}
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
          </div>
          <div className="sm:hidden">
            <AdminUsersMobileCards users={query.data.items} dateFmt={dateFmt} />
          </div>
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
  const disableUser = useDisableUserMutation();
  const enableUser = useEnableUserMutation();
  const isStatusPending = disableUser.isPending || enableUser.isPending;

  async function toggleAccountStatus() {
    try {
      if (user.isDisabled) {
        await enableUser.mutateAsync({ userId: user.id });
      } else {
        await disableUser.mutateAsync({ userId: user.id });
      }
    } catch {
      // Toast emitted by mutation onError.
    }
  }

  return (
    <Table.Row className="bg-content1 transition-colors hover:bg-content2">
      <Table.Cell className="px-4 py-3">
        <p className="font-medium text-foreground">{user.fullName}</p>
        <p className="text-xs text-default-500">{user.email}</p>
      </Table.Cell>
      <Table.Cell className="hidden px-4 py-3 tabular-nums text-default-500 sm:table-cell">
        {dateFmt.format(new Date(user.createdAt))}
      </Table.Cell>
      <Table.Cell className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip color={user.isDisabled ? 'danger' : 'success'} size="sm" variant="soft">
            <Chip.Label>
              {user.isDisabled ? t('admin.users.statusBlocked') : t('admin.users.statusActive')}
            </Chip.Label>
          </Chip>
          {!user.roles.includes('Admin') ? (
            <Button
              type="button"
              size="sm"
              variant={user.isDisabled ? 'secondary' : 'danger-soft'}
              isDisabled={isStatusPending}
              isPending={isStatusPending}
              aria-label={user.isDisabled
                ? t('admin.users.unblockLabel', { name: user.fullName })
                : t('admin.users.blockLabel', { name: user.fullName })}
              onPress={() => void toggleAccountStatus()}
            >
              {user.isDisabled ? t('admin.users.unblock') : t('admin.users.block')}
            </Button>
          ) : null}
        </div>
      </Table.Cell>
    </Table.Row>
  );
}
