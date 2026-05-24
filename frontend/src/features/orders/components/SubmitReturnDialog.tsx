import { AlertDialog, Button, Label, TextArea, TextField, useOverlayState } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useSubmitReturnMutation } from '../hooks';
import { SelectField } from '../../../shared/components/SelectField';

const PREDEFINED_REASONS = [
  'defect',
  'wrongSize',
  'wrongColor',
  'wrongProduct',
  'other',
] as const;
type ReturnReason = (typeof PREDEFINED_REASONS)[number];

const submitReturnSchema = z.object({
  reason: z.preprocess(
    (val) => val || '',
    z.string().refine((v) => PREDEFINED_REASONS.includes(v as ReturnReason), {
      message: 'reasonRequired',
    })
  ) as unknown as z.ZodType<ReturnReason, z.ZodTypeDef, unknown>,
  notes: z.string().max(500, 'notesTooLong').optional(),
}).superRefine((data, ctx) => {
  if (data.reason === 'other' && !data.notes?.trim()) {
    ctx.addIssue({ 
      code: z.ZodIssueCode.custom, 
      path: ['notes'], 
      message: 'notesRequiredForOther' 
    });
  }
});

type SubmitReturnFormValues = z.infer<typeof submitReturnSchema>;

export function SubmitReturnDialog({ orderNumber }: { orderNumber: string }) {
  const { t } = useTranslation();
  const state = useOverlayState({ defaultOpen: false });
  const mutation = useSubmitReturnMutation(orderNumber);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmitReturnFormValues>({
    resolver: zodResolver(submitReturnSchema),
    defaultValues: { reason: undefined, notes: '' },
  });
  const pending = mutation.isPending || isSubmitting;
  const error = (message?: string) => (message ? t(`returns.errors.${message}`) : null);

  const reasonOptions = PREDEFINED_REASONS.map((r) => ({
    value: r,
    label: t(`returns.reasons.${r}`),
  }));

  return (
    <>
      <Button type="button" variant="primary" size="sm" onPress={state.open}>
        {t('returns.actions.submit')}
      </Button>
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={state.isOpen}
          isDismissable={!pending}
          onOpenChange={(open) => {
            state.setOpen(open);
            if (!open && !pending) reset();
          }}
        >
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              {({ close }) => (
                <form
                  noValidate
                  onSubmit={handleSubmit(async (values) => {
                    try {
                      const reasonTranslation = t(`returns.reasons.${values.reason}`);
                      const customerReason = values.notes?.trim()
                        ? `${reasonTranslation}\n\n${values.notes.trim()}`
                        : reasonTranslation;

                      await mutation.mutateAsync({ customerReason });
                      reset();
                      close();
                    } catch {
                      // Handled by mutation hook's onError
                    }
                  })}
                >
                  <AlertDialog.Header>
                    <AlertDialog.Heading>{t('returns.eligibility.title')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body className="space-y-4">
                    <Controller name="reason" control={control} render={({ field }) => (
                      <SelectField
                        label={t('returns.form.reasonLabel')}
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder={t('returns.form.reasonPlaceholder')}
                        errorMessage={error(errors.reason?.message as string | undefined)}
                        options={reasonOptions}
                      />
                    )} />

                    <Controller name="notes" control={control} render={({ field }) => (
                      <TextField isInvalid={Boolean(errors.notes)} className="flex flex-col gap-1">
                        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
                           {t('returns.form.notesLabel')}
                        </Label>
                        <TextArea
                          value={field.value || ''}
                          onChange={(event) => field.onChange(event.target.value)}
                          rows={4}
                          maxLength={500}
                          fullWidth
                          placeholder={t('returns.form.notesPlaceholder')}
                          className="text-sm text-start border border-default-400 dark:border-default-300"
                        />
                        <div className="flex justify-between items-center text-xs mt-1">
                          {errors.notes?.message ? (
                            <p role="alert" className="text-danger">{error(errors.notes.message as string | undefined)}</p>
                          ) : <div />}
                          <p className="text-default-500">
                            {t('returns.form.charCount', { count: (field.value || '').length })}
                          </p>
                        </div>
                      </TextField>
                    )} />

                    {mutation.isError ? (
                      <p role="alert" className="text-xs text-danger mt-2">
                        {t('returns.errors.submitFailed')}
                      </p>
                    ) : null}
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button type="button" variant="ghost" size="sm" isDisabled={pending} onPress={close}>
                      {t('common.dismiss')}
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isPending={pending} isDisabled={pending}>
                      {t('returns.actions.submit')}
                    </Button>
                  </AlertDialog.Footer>
                </form>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
