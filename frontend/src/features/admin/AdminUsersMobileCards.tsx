/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */

import { AlertDialog, Button, Card, Chip } from '@heroui/react';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AdminUserDto } from './users/types';
import { useDisableUserMutation, useEnableUserMutation } from './users/hooks';

interface AdminUsersMobileCardsProps {
  users: AdminUserDto[];
  dateFmt: Intl.DateTimeFormat;
  authUserId?: string;
}

export function AdminUsersMobileCards({ users, dateFmt, authUserId }: AdminUsersMobileCardsProps) {
  const { t } = useTranslation();

  return (
    <ul role="list" className="space-y-3">
      {users.map((user) => (
        <AdminUsersMobileCard key={user.id} user={user} dateFmt={dateFmt} t={t} authUserId={authUserId} />
      ))}
    </ul>
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
  const isStatusPending = disableUser.isPending || enableUser.isPending;
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    <li role="listitem">
      <Card className="border border-divider/60">
        <Card.Content className="gap-3 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{user.fullName}</p>
              <p className="truncate text-xs text-default-500">{user.email}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-default-500">
              {dateFmt.format(new Date(user.createdAt))}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
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
                onPress={() => { /* navigate to /account/security */ }}
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
        </Card.Content>
      </Card>
    </li>
  );
}
