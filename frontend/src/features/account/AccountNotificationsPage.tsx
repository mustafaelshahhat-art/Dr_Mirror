import { Switch } from '@heroui/react';
import { toast } from '@heroui/react/toast';
import { Bell } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../shared/lib/query-keys';
import { accountApi } from './api';
import type { NotificationPreferenceDto } from './types';

export function AccountNotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  const queryKey = queryKeys.account.notificationPreferences();
  const query = useQuery({
    queryKey,
    queryFn: accountApi.getNotificationPreferences,
  });
  const mutation = useMutation({
    mutationFn: accountApi.updateNotificationPreferences,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPreferenceDto>(queryKey);
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      errorToast(error);
    },
    onSuccess: () => {
      toast.success(t('notifications.preference.success'));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <Bell className="size-5 text-primary" aria-hidden />
          {t('notifications.preference.title')}
        </h1>
        <p className="mt-1 text-sm text-default-500">{t('notifications.preference.subtitle')}</p>
      </div>

      {query.isError ? (
        <QueryErrorState
          message={t('notifications.preference.errorLoad')}
          retryLabel={t('common.query.retry')}
          onRetry={() => void query.refetch()}
          error={query.error}
        />
      ) : (
        <div className="content-surface p-6">
          <Switch
            isSelected={query.data?.whatsAppEnabled ?? true}
            isDisabled={query.isLoading || mutation.isPending}
            onChange={(whatsAppEnabled) => mutation.mutate({ whatsAppEnabled })}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <span className="block text-base font-semibold">{t('notifications.preference.whatsappLabel')}</span>
            <span className="block text-sm text-default-500">{t('notifications.preference.whatsappDescription')}</span>
          </Switch>
        </div>
      )}
    </section>
  );
}
