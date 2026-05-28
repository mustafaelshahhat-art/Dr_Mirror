/* eslint-disable i18next/no-literal-string */
import { Button, Chip, Form, Table } from '@heroui/react';
import { KeyRound, Users, Shield, User, Calendar, UserCheck, UserX, UserPlus, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from '@heroui/react/toast';

import { api } from '../../shared/lib/api-client';
import { FormField } from '../auth/components/FormField';
import { useAuth } from '../auth/useAuth';
import { SearchInput } from '../catalog/components/SearchInput';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';
import type { AdminUserDto, UserRole } from './users/types';
import { useAdminUsersQuery, useDisableUserMutation, useEnableUserMutation, useUpdateUserRolesMutation } from './users/hooks';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { AdminUsersMobileCards } from './AdminUsersMobileCards';
import { PageHeader } from '../../shared/components/PageHeader';
import { Stat } from '../../shared/components/Stat';
import { SelectField } from '../../shared/components/SelectField';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand font-semibold text-xs tracking-tight shrink-0 select-none">
      {initials || <User className="size-4" />}
    </div>
  );
}

function RoleBadge({ roles }: { roles: UserRole[] }) {
  const { t } = useTranslation();
  const isAdmin = roles.includes('Admin');
  return (
    <Chip
      color={isAdmin ? 'accent' : 'default'}
      size="sm"
      variant="soft"
      className="border border-primary-200/10"
    >
      <Chip.Label className="flex items-center gap-1 font-semibold">
        {isAdmin ? <Shield className="size-3 text-primary" aria-hidden /> : <User className="size-3 text-default-500" aria-hidden />}
        {isAdmin ? t('admin.users.roleAdmin') : t('admin.users.roleCustomer')}
      </Chip.Label>
    </Chip>
  );
}

function StatusBadge({ isDisabled }: { isDisabled: boolean }) {
  const { t } = useTranslation();
  return (
    <Chip
      color={isDisabled ? 'danger' : 'success'}
      size="sm"
      variant="soft"
      className="border border-divider/10"
    >
      <Chip.Label className="flex items-center gap-1 font-semibold">
        {isDisabled ? <UserX className="size-3 text-danger" aria-hidden /> : <UserCheck className="size-3 text-success" aria-hidden />}
        {isDisabled ? t('admin.users.statusBlocked') : t('admin.users.statusActive')}
      </Chip.Label>
    </Chip>
  );
}

export function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const query = useAdminUsersQuery(q.trim() || undefined, page);

  const isAr = i18n.language?.startsWith('ar');
  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    numberingSystem: 'latn',
  });

  const total = query.data?.totalCount ?? 0;
  const rawUsers = query.data?.items ?? [];

  // Summary statistics calculated safely from the loaded page list
  const activeCount = rawUsers.filter((u) => !u.isDisabled).length;
  const blockedCount = rawUsers.filter((u) => u.isDisabled).length;
  const adminCount = rawUsers.filter((u) => u.roles.includes('Admin')).length;
  const customerCount = rawUsers.filter((u) => u.roles.includes('Buyer')).length;

  // Client-side filtering & sorting applied on the loaded page's list
  let displayedUsers = [...rawUsers];

  if (roleFilter && roleFilter !== 'all') {
    displayedUsers = displayedUsers.filter((u) => u.roles.includes(roleFilter as UserRole));
  }

  if (statusFilter && statusFilter !== 'all') {
    const filterIsDisabled = statusFilter === 'blocked';
    displayedUsers = displayedUsers.filter((u) => u.isDisabled === filterIsDisabled);
  }

  if (sortBy === 'newest') {
    displayedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortBy === 'oldest') {
    displayedUsers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sortBy === 'name') {
    displayedUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <PageHeader
        title={t('admin.users.title')}
        subtitle={t('admin.users.subtitle')}
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label={t('admin.users.stats.total')} value={query.isLoading ? '...' : String(total)} size="sm" />
        <Stat label={t('admin.users.stats.active')} value={query.isLoading ? '...' : String(activeCount)} size="sm" />
        <Stat label={t('admin.users.stats.admins')} value={query.isLoading ? '...' : String(adminCount)} size="sm" />
        <Stat label={t('admin.users.stats.customers')} value={query.isLoading ? '...' : String(customerCount)} size="sm" />
        <Stat label={t('admin.users.stats.blocked')} value={query.isLoading ? '...' : String(blockedCount)} size="sm" />
      </div>

      {/* Filters & Search Control Panel */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-divider/40 bg-content1 px-4 py-3 rounded-2xl shadow-sm">
        <div className="max-w-sm flex-1">
          <SearchInput
            value={q}
            onCommit={(val) => { setQ(val); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SelectField
            label={t('admin.users.filterRole')}
            hideLabel
            isFilter
            value={roleFilter}
            emptyLabel={t('admin.users.allRoles')}
            onChange={(next) => { setRoleFilter(next); setPage(1); }}
            options={[
              { value: 'Buyer', label: t('admin.users.roleCustomer') },
              { value: 'Admin', label: t('admin.users.roleAdmin') },
            ]}
            className="w-full sm:w-40 text-xs font-semibold"
          />
          <SelectField
            label={t('admin.users.filterStatus')}
            hideLabel
            isFilter
            value={statusFilter}
            emptyLabel={t('admin.users.allStatuses')}
            onChange={(next) => { setStatusFilter(next); setPage(1); }}
            options={[
              { value: 'active', label: t('admin.users.statusActive') },
              { value: 'blocked', label: t('admin.users.statusBlocked') },
            ]}
            className="w-full sm:w-40 text-xs font-semibold"
          />
          <SelectField
            label={t('admin.users.sortBy')}
            hideLabel
            isFilter
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'newest', label: t('admin.users.sortNewest') },
              { value: 'oldest', label: t('admin.users.sortOldest') },
              { value: 'name', label: t('admin.users.sortName') },
            ]}
            className="w-full sm:w-40 text-xs font-semibold"
          />
        </div>
      </div>

      {query.isLoading ? (
        <Table className="rounded-large border border-divider/60">
          <Table.ScrollContainer>
            <Table.Content aria-label={t('admin.users.loading')} aria-busy={true}>
              <TableSkeletonHeader cols={6} label={t('admin.users.loading')} />
              <Table.Body>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
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
      ) : displayedUsers.length ? (
        <div className="space-y-4">
          <div className="hidden md:block">
            <Table className="rounded-2xl border border-divider/60 overflow-hidden shadow-sm">
              <Table.ScrollContainer>
                <Table.Content aria-label={t('admin.users.title')} aria-busy={query.isFetching}>
                  <Table.Header>
                    <Table.Column isRowHeader className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-default-500 bg-default-50">
                      {t('admin.users.colName')}
                    </Table.Column>
                    <Table.Column className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-default-500 bg-default-50">
                      {t('admin.users.colEmailPhone')}
                    </Table.Column>
                    <Table.Column className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-default-500 bg-default-50">
                      {t('admin.users.colRole')}
                    </Table.Column>
                    <Table.Column className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-default-500 bg-default-50">
                      {t('admin.users.colStatus')}
                    </Table.Column>
                    <Table.Column className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-default-500 bg-default-50">
                      {t('admin.users.colJoined')}
                    </Table.Column>
                    <Table.Column className="px-5 py-3 text-end text-xs font-bold uppercase tracking-wider text-default-500 bg-default-50">
                      {t('admin.users.colActions')}
                    </Table.Column>
                  </Table.Header>
                  <Table.Body className="divide-y divide-divider/40">
                    {displayedUsers.map((user) => (
                      <UserRow key={user.id} user={user} dateFmt={dateFmt} authUserId={authUser?.id} />
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
          <div className="md:hidden">
            <AdminUsersMobileCards users={displayedUsers} dateFmt={dateFmt} authUserId={authUser?.id} />
          </div>
          <PaginationControls
            page={page}
            totalPages={query.data?.totalPages ?? 1}
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
  const updateRoles = useUpdateUserRolesMutation();
  
  const isStatusPending = disableUser.isPending || enableUser.isPending;
  const isRolePending = updateRoles.isPending;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const isOwnRow = user.id === authUserId && user.roles.includes('Admin');
  const hasAdminRole = user.roles.includes('Admin');

  async function toggleAccountStatus() {
    try {
      if (user.isDisabled) {
        await enableUser.mutateAsync({ userId: user.id });
      } else {
        await disableUser.mutateAsync({ userId: user.id });
      }
    } catch {
      // Toast handles error automatically.
    }
    setConfirmOpen(false);
  }

  async function toggleUserRole() {
    try {
      const nextRole: UserRole = hasAdminRole ? 'Buyer' : 'Admin';
      await updateRoles.mutateAsync({ userId: user.id, roles: [nextRole] });
      toast.success(t('admin.users.changeRoleSuccess'));
    } catch {
      toast.danger(t('admin.users.changeRoleError'));
    }
    setRoleConfirmOpen(false);
  }

  return (
    <>
      <Table.Row className="bg-content1 transition-colors hover:bg-content2/60">
        {/* Name & Avatar */}
        <Table.Cell className="px-5 py-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.fullName} />
            <div>
              <p className="font-semibold text-foreground text-sm tracking-tight">{user.fullName}</p>
            </div>
          </div>
        </Table.Cell>

        {/* Contact info (Email & Phone) */}
        <Table.Cell className="px-5 py-4">
          <div className="flex flex-col gap-0.5 text-start">
            <span className="text-sm font-medium text-foreground select-all" dir="ltr">{user.email}</span>
            {user.phoneNumber ? (
              <span className="text-xs text-default-500 tabular-nums select-all" dir="ltr">{user.phoneNumber}</span>
            ) : (
              <span className="text-xs text-default-400 italic">—</span>
            )}
          </div>
        </Table.Cell>

        {/* Role badge */}
        <Table.Cell className="px-5 py-4">
          <RoleBadge roles={user.roles} />
        </Table.Cell>

        {/* Status badge */}
        <Table.Cell className="px-5 py-4">
          <StatusBadge isDisabled={user.isDisabled} />
        </Table.Cell>

        {/* Joined Date */}
        <Table.Cell className="px-5 py-4 tabular-nums text-xs text-default-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-default-400 shrink-0" />
            <span>{dateFmt.format(new Date(user.createdAt))}</span>
          </div>
        </Table.Cell>

        {/* User actions */}
        <Table.Cell className="px-5 py-4">
          <div className="flex items-center justify-end gap-2">
            {isOwnRow ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => setShowChangePassword((v) => !v)}
                className="gap-1.5 text-xs font-semibold"
              >
                <KeyRound className="size-3.5" aria-hidden />
                {t('account.account.security.changePasswordTitle')}
              </Button>
            ) : null}

            {/* Actions for other users */}
            {!isOwnRow ? (
              <>
                {/* Role Switcher */}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  isDisabled={isRolePending}
                  onPress={() => setRoleConfirmOpen(true)}
                  className="gap-1.5 text-xs font-semibold"
                  aria-label={t('admin.users.changeRole') + ' ' + user.fullName}
                >
                  {hasAdminRole ? <UserMinus className="size-3.5 text-warning" /> : <UserPlus className="size-3.5 text-primary" />}
                  {t('admin.users.changeRole')}
                </Button>

                {/* Block / Unblock Account */}
                {!hasAdminRole ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={user.isDisabled ? 'secondary' : 'danger-soft'}
                    isDisabled={isStatusPending}
                    aria-label={user.isDisabled
                      ? t('admin.users.unblockLabel', { name: user.fullName })
                      : t('admin.users.blockLabel', { name: user.fullName })}
                    onPress={() => setConfirmOpen(true)}
                    className="text-xs font-semibold"
                  >
                    {user.isDisabled ? t('admin.users.unblock') : t('admin.users.block')}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>

          {/* Confirm Dialog for Account Status (Block/Unblock) */}
          <ConfirmDialog
            isOpen={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={user.isDisabled
              ? t('admin.users.unblockConfirm', { name: user.fullName })
              : t('admin.users.blockConfirm', { name: user.fullName })}
            description={user.isDisabled
              ? t('admin.users.unblockConfirmMsg')
              : t('admin.users.blockConfirmMsg')}
            confirmLabel={t('admin.transition.confirm')}
            cancelLabel={t('admin.catalog.actions.cancel')}
            isPending={isStatusPending}
            onConfirm={() => void toggleAccountStatus()}
            variant={user.isDisabled ? 'primary' : 'danger'}
          />

          {/* Confirm Dialog for Role Switch (Promote/Demote) */}
          <ConfirmDialog
            isOpen={roleConfirmOpen}
            onOpenChange={setRoleConfirmOpen}
            title={t('admin.users.changeRoleConfirm', { name: user.fullName })}
            description={t('admin.users.changeRoleConfirmMsg', {
              name: user.fullName,
              role: hasAdminRole ? t('admin.users.roleCustomer') : t('admin.users.roleAdmin'),
            })}
            confirmLabel={t('admin.transition.confirm')}
            cancelLabel={t('admin.catalog.actions.cancel')}
            isPending={isRolePending}
            onConfirm={() => void toggleUserRole()}
            variant={hasAdminRole ? 'danger' : 'primary'}
          />
        </Table.Cell>
      </Table.Row>
      
      {/* Change Password row (Own account only) */}
      {isOwnRow && showChangePassword ? (
        <Table.Row>
          <Table.Cell colSpan={6} className="border-t-0 bg-content2/45 px-6 py-5">
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
      toast.success(t('account.account.security.saved') || 'Password changed successfully.');
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
    <Form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4">
      {serverError ? (
        <p className="text-sm text-danger font-medium" role="alert">{serverError}</p>
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
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary" size="sm" isPending={mutation.isPending} className="font-semibold px-4">
          {t('account.account.security.submit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={onClose} className="font-semibold">
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </Form>
  );
}
