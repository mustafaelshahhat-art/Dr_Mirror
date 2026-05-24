import { Button, Card, Form, Label, TextArea, TextField, Toolbar } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { queryKeys } from '../../../shared/lib/query-keys';
import { ReturnRequestCard } from '../../orders/components/ReturnRequestCard';
import { ReturnStatusBadge } from '../../orders/components/ReturnStatusBadge';
import { RETURN_STATUSES, type ReturnStatus } from '../../orders/types';
import { adminReturnsApi, type AdminReturnRequestDto } from '../api';

const rejectSchema = z.object({
  adminNote: z.string().trim().min(1, 'adminNoteRequired').max(1000, 'adminNoteTooLong'),
});

type RejectFormValues = z.infer<typeof rejectSchema>;
type ReturnAction = 'Approve' | 'Reject' | 'MarkReceived' | 'Complete';

const ACTIONS_BY_STATUS: Partial<Record<ReturnStatus, ReturnAction[]>> = {
  Requested: ['Approve', 'Reject'],
  Approved: ['MarkReceived'],
  Received: ['Complete'],
};

const ACTION_KEY: Record<ReturnAction, string> = {
  Approve: 'actions.approve',
  Reject: 'actions.reject',
  MarkReceived: 'actions.markReceived',
  Complete: 'actions.complete',
};

export function AdminReturnSection({ orderNumber, lang }: { orderNumber: string; lang: 'ar' | 'en' }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<ReturnAction | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const query = useQuery({
    queryKey: queryKeys.admin.orders.returns(orderNumber),
    queryFn: () => adminReturnsApi.listReturns({ pageSize: 100 }),
    staleTime: 15_000,
    select: (data) => data.items.filter((item) => item.orderNumber === orderNumber),
  });
  const mutation = useMutation<AdminReturnRequestDto, Error, { id: string; action: ReturnAction; adminNote?: string | null }>({
    mutationFn: (input) => adminReturnsApi.transitionReturn(orderNumber, input.id, {
      action: input.action,
      adminNote: input.adminNote ?? null,
    }),
    onSuccess: () => {
      setSelectedAction(null);
      setConflict(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.returns(orderNumber) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.detail(orderNumber) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.returnsList({}) });
    },
    onError: (error) => {
      const status = (error as { response?: { status?: number } }).response?.status;
      setConflict(status === 409 ? t('returns.messages.conflict') : t('returns.errors.cancelFailed'));
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { adminNote: '' },
  });
  const pending = mutation.isPending || isSubmitting;
  const returns = query.data ?? [];
  const activeReturn = returns.find((item) =>
    item.status === RETURN_STATUSES.Requested || item.status === RETURN_STATUSES.Approved || item.status === RETURN_STATUSES.Received,
  ) ?? returns[0];
  const actions = activeReturn ? ACTIONS_BY_STATUS[activeReturn.status] ?? [] : [];
  const error = (message?: string) => (message ? t(`returns.errors.${message}`) : null);

  return (
    <section aria-labelledby="admin-return-heading" className="space-y-2">
      <h2 id="admin-return-heading" className="text-base font-semibold text-foreground">
        {t('returns.eligibility.title')}
      </h2>
      <Card>
        <Card.Content className="space-y-4">
          {query.isLoading ? (
            <p className="text-sm text-default-500">{t('returns.messages.loading')}</p>
          ) : !activeReturn ? (
            <p className="text-sm text-default-500">{t('returns.eligibility.none')}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ReturnStatusBadge status={activeReturn.status} />
                {actions.length > 0 ? (
                  <Toolbar aria-label={t('returns.eligibility.title')} className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action}
                        type="button"
                        size="sm"
                        variant={action === 'Reject' ? 'danger-soft' : 'outline'}
                        isDisabled={pending}
                        onPress={() => {
                          setConflict(null);
                          setSelectedAction(selectedAction === action ? null : action);
                          reset();
                        }}
                      >
                        {t(`returns.${ACTION_KEY[action]}`)}
                      </Button>
                    ))}
                  </Toolbar>
                ) : null}
              </div>

              {selectedAction === 'Reject' ? (
                <Form
                  onSubmit={handleSubmit(async (values) => {
                    await mutation.mutateAsync({ id: activeReturn.id, action: 'Reject', adminNote: values.adminNote.trim() });
                    reset();
                  })}
                  className="space-y-3 rounded-medium border border-divider/60 bg-content2 p-3"
                >
                  <Controller name="adminNote" control={control} render={({ field }) => (
                    <TextField isInvalid={Boolean(errors.adminNote)} className="flex flex-col gap-1">
                      <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
                        {t('returns.form.adminNoteLabel')}
                      </Label>
                      <TextArea
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        rows={3}
                        maxLength={1000}
                        fullWidth
                        placeholder={t('returns.form.adminNotePlaceholder')}
                        className="text-sm text-start border border-default-400 dark:border-default-300"
                      />
                      {errors.adminNote?.message ? (
                        <p role="alert" className="text-xs text-danger">{error(errors.adminNote.message)}</p>
                      ) : null}
                    </TextField>
                  )} />
                  <Button type="submit" variant="danger" size="sm" isPending={pending} isDisabled={pending}>
                    {t('returns.actions.reject')}
                  </Button>
                </Form>
              ) : selectedAction ? (
                <div className="flex gap-2 rounded-medium border border-divider/60 bg-content2 p-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    isPending={pending}
                    isDisabled={pending}
                    onPress={() => mutation.mutate({ id: activeReturn.id, action: selectedAction })}
                  >
                    {t(`returns.${ACTION_KEY[selectedAction]}`)}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" isDisabled={pending} onPress={() => setSelectedAction(null)}>
                    {t('common.dismiss')}
                  </Button>
                </div>
              ) : null}

              {conflict ? <p className="text-sm text-danger">{conflict}</p> : null}

              <ReturnRequestCard orderNumber={orderNumber} request={activeReturn} lang={lang} canCancel={false} />
            </>
          )}
        </Card.Content>
      </Card>
    </section>
  );
}
