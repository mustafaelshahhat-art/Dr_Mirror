import { AlertDialog, Button, Chip, Form, Table } from '@heroui/react';
import { KeyRound, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { api } from '../../shared/lib/api-client';
import { FormField } from '../auth/components/FormField';
import { useAuth } from '../auth/useAuth';
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
  const { user: authUser } = useAuth();
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
        error={query.error}
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
                      <UserRow key={user.id} user={user} dateFmt={dateFmt} authUserId={authUser?.id} />
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
          <div className="sm:hidden">
            <AdminUsersMobileCards users={query.data.items} dateFmt={dateFmt} authUserId={authUser?.id} />
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
  authUserId,
}: {
  user: AdminUserDto;
  dateFmt: Intl.DateTimeFormat;
  authUserId?: string;
}) {
  const { t } = useTranslation();
  const disableUser = useDisableUserMutation();
  const enableUser = useEnableUserMutation();
  const isStatusPending = disableUser.isPending || enableUser.isPending;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const isOwnRow = user.id === authUserId && user.roles.includes('Admin');

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
    setConfirmOpen(false);
  }

  return (
    <>
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
            {isOwnRow ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => setShowChangePassword((v) => !v)}
              >
                <KeyRound className="size-3.5" aria-hidden />
                {t('account.account.security.changePasswordTitle')}
              </Button>
            ) : null}
            {!user.roles.includes('Admin') ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={user.isDisabled ? 'secondary' : 'danger-soft'}
                  isDisabled={isStatusPending}
                  aria-label={user.isDisabled
                    ? t('admin.users.unblockLabel', { name: user.fullName })
                    : t('admin.users.blockLabel', { name: user.fullName })}
                  onPress={() => setConfirmOpen(true)}
                >
                  {user.isDisabled ? t('admin.users.unblock') : t('admin.users.block')}
                </Button>
                <AlertDialog>
                  <AlertDialog.Backdrop
                    isOpen={confirmOpen}
                    isDismissable={!isStatusPending}
                    onOpenChange={(open) => { if (!open) setConfirmOpen(false); }}
                  >
                    <AlertDialog.Container size="xs">
                      <AlertDialog.Dialog>
                        {({ close }) => (
                          <>
                            <AlertDialog.Header>
                              <AlertDialog.Heading>
                                {user.isDisabled
                                  ? t('admin.users.unblockConfirm', { name: user.fullName })
                                  : t('admin.users.blockConfirm', { name: user.fullName })}
                              </AlertDialog.Heading>
                            </AlertDialog.Header>
                            <AlertDialog.Body>
                              <p className="text-sm text-default-500">
                                {user.isDisabled
                                  ? t('admin.users.unblockConfirmMsg')
                                  : t('admin.users.blockConfirmMsg')}
                              </p>
                            </AlertDialog.Body>
                            <AlertDialog.Footer>
                              <Button variant="ghost" isDisabled={isStatusPending} onPress={close}>
                                {t('admin.catalog.actions.cancel')}
                              </Button>
                              <Button
                                variant={user.isDisabled ? 'secondary' : 'danger'}
                                isPending={isStatusPending}
                                onPress={() => void toggleAccountStatus()}
                              >
                                {t('admin.transition.confirm')}
                              </Button>
                            </AlertDialog.Footer>
                          </>
                        )}
                      </AlertDialog.Dialog>
                    </AlertDialog.Container>
                  </AlertDialog.Backdrop>
                </AlertDialog>
              </>
            ) : null}
          </div>
        </Table.Cell>
      </Table.Row>
      {isOwnRow && showChangePassword ? (
        <Table.Row>
          <Table.Cell colSpan={3} className="border-t-0 bg-content2 px-6 py-4">
            <AdminChangePasswordForm onClose={() => setShowChangePassword(false)} />
          </Table.Cell>
        </Table.Row>
      ) : null}
    </>
  );
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'auth.errors.passwordRequired'),
    newPassword: z
      .string()
      .min(8, 'auth.errors.passwordTooShort')
      .max(128, 'auth.errors.passwordTooLong')
      .regex(/[a-z]/, 'auth.errors.passwordMissingLower')
      .regex(/[A-Z]/, 'auth.errors.passwordMissingUpper')
      .regex(/[0-9]/, 'auth.errors.passwordMissingDigit'),
    confirmPassword: z.string().min(1, 'auth.errors.passwordRequired'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'auth.errors.passwordsMismatch',
    path: ['confirmPassword'],
  });

type AdminChangePasswordValues = z.infer<typeof changePasswordSchema>;

function AdminChangePasswordForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<AdminChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: AdminChangePasswordValues) => {
      await api.post('/auth/change-password', values);
    },
    onSuccess: () => {
      reset();
      setServerError(null);
      onClose();
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 400) {
        setServerError(t('account.account.security.errorIncorrectPassword'));
      } else {
        setServerError(t('account.account.security.errorUnknown'));
      }
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <Form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-3">
      {serverError ? (
        <p className="text-sm text-danger" role="alert">{serverError}</p>
      ) : null}

      <FormField
        name="currentPassword"
        control={control}
        label={t('account.account.security.currentPassword')}
        type="password"
        autoComplete="current-password"
        isRequired
        variant="bordered"
      />
      <FormField
        name="newPassword"
        control={control}
        label={t('account.account.security.newPassword')}
        type="password"
        autoComplete="new-password"
        isRequired
        variant="bordered"
      />
      <FormField
        name="confirmPassword"
        control={control}
        label={t('account.account.security.confirmPassword')}
        type="password"
        autoComplete="new-password"
        isRequired
        variant="bordered"
      />
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" isPending={mutation.isPending}>
          {t('account.account.security.submit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={onClose}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </Form>
  );
}
