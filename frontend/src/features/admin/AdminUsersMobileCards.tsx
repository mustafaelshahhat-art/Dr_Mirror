/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */
/* eslint-disable i18next/no-literal-string */

import { Button, Card, Chip } from '@heroui/react';
import { KeyRound, Shield, User, Calendar, UserCheck, UserX, UserPlus, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@heroui/react/toast';

import type { AdminUserDto, UserRole } from './users/types';
import { useDisableUserMutation, useEnableUserMutation, useUpdateUserRolesMutation } from './users/hooks';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

interface AdminUsersMobileCardsProps {
  users: AdminUserDto[];
  dateFmt: Intl.DateTimeFormat;
  authUserId?: string;
}

export function AdminUsersMobileCards({ users, dateFmt, authUserId }: AdminUsersMobileCardsProps) {
  const { t } = useTranslation();

  return (
    <ul role="list" className="space-y-4">
      {users.map((user) => (
        <AdminUsersMobileCard key={user.id} user={user} dateFmt={dateFmt} t={t} authUserId={authUserId} />
      ))}
    </ul>
  );
}

function RoleBadge({ roles, t }: { roles: UserRole[]; t: ReturnType<typeof useTranslation>['t'] }) {
  const isAdmin = roles.includes('Admin');
  return (
    <Chip
      color={isAdmin ? 'accent' : 'default'}
      size="sm"
      variant="soft"
      className="border border-primary-200/10"
    >
      <Chip.Label className="flex items-center gap-1 font-semibold text-[10px]">
        {isAdmin ? <Shield className="size-3 text-primary" aria-hidden /> : <User className="size-3 text-default-500" aria-hidden />}
        {isAdmin ? t('admin.users.roleAdmin') : t('admin.users.roleCustomer')}
      </Chip.Label>
    </Chip>
  );
}

function StatusBadge({ isDisabled, t }: { isDisabled: boolean; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <Chip
      color={isDisabled ? 'danger' : 'success'}
      size="sm"
      variant="soft"
      className="border border-divider/10"
    >
      <Chip.Label className="flex items-center gap-1 font-semibold text-[10px]">
        {isDisabled ? <UserX className="size-3 text-danger" aria-hidden /> : <UserCheck className="size-3 text-success" aria-hidden />}
        {isDisabled ? t('admin.users.statusBlocked') : t('admin.users.statusActive')}
      </Chip.Label>
    </Chip>
  );
}

function AdminUsersMobileCard({
  user,
  dateFmt,
  t,
  authUserId,
}: {
  user: AdminUserDto;
  dateFmt: Intl.DateTimeFormat;
  t: ReturnType<typeof useTranslation>['t'];
  authUserId?: string;
}) {
  const disableUser = useDisableUserMutation();
  const enableUser = useEnableUserMutation();
  const updateRoles = useUpdateUserRolesMutation();

  const isStatusPending = disableUser.isPending || enableUser.isPending;
  const isRolePending = updateRoles.isPending;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);

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
      // Toast handles errors automatically.
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
    <li role="listitem" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border border-divider/60 shadow-sm overflow-hidden bg-content1 rounded-2xl">
        <Card.Content className="p-4 flex flex-col gap-3">
          {/* Header Area */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-foreground text-base tracking-tight">{user.fullName}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[11px] text-default-500 tabular-nums bg-default-50 px-2 py-0.5 rounded-full border border-divider/40">
              <Calendar className="size-3 text-default-400" aria-hidden />
              <span>{dateFmt.format(new Date(user.createdAt))}</span>
            </div>
          </div>

          {/* Details Area */}
          <div className="flex flex-col gap-1 text-start">
            <span className="text-xs font-semibold text-foreground select-all break-all" dir="ltr">{user.email}</span>
            {user.phoneNumber ? (
              <span className="text-xs text-default-500 tabular-nums select-all" dir="ltr">{user.phoneNumber}</span>
            ) : null}
          </div>

          {/* Badges Area */}
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge roles={user.roles} t={t} />
            <StatusBadge isDisabled={user.isDisabled} t={t} />
          </div>

          {/* Actions Area */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-divider/45">
            {isOwnRow ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => { /* Page will render the password form on desktop, on mobile we point to standard account */ }}
                className="w-full justify-center gap-1.5 text-xs font-bold h-9"
              >
                <KeyRound className="size-4" aria-hidden />
                {t('account.account.security.changePasswordTitle')}
              </Button>
            ) : null}

            {!isOwnRow ? (
              <>
                {/* Role Switcher */}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  isDisabled={isRolePending}
                  onPress={() => setRoleConfirmOpen(true)}
                  className="flex-1 justify-center gap-1.5 text-xs font-bold h-9"
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
                    className="flex-1 justify-center text-xs font-bold h-9"
                  >
                    {user.isDisabled ? t('admin.users.unblock') : t('admin.users.block')}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </Card.Content>
      </Card>

      {/* Account Status Confirm Dialog */}
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

      {/* Role Change Confirm Dialog */}
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
    </li>
  );
}
