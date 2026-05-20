/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */

import { Card, Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import type { AdminUserDto } from './users/types';

interface AdminUsersMobileCardsProps {
  users: AdminUserDto[];
  dateFmt: Intl.DateTimeFormat;
}

export function AdminUsersMobileCards({ users, dateFmt }: AdminUsersMobileCardsProps) {
  const { t } = useTranslation();

  return (
    <ul role="list" className="space-y-3">
      {users.map((user) => (
        <li key={user.id} role="listitem">
          <Card className="border border-divider/60">
            <Card.Content className="gap-2 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{user.fullName}</p>
                  <p className="truncate text-xs text-default-500">{user.email}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-default-500">
                  {dateFmt.format(new Date(user.createdAt))}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {user.roles.map((role) => (
                  <Chip key={role} size="sm" variant="soft">
                    <Chip.Label>{t(`admin.users.roles.names.${role}`)}</Chip.Label>
                  </Chip>
                ))}
              </div>
            </Card.Content>
          </Card>
        </li>
      ))}
    </ul>
  );
}
