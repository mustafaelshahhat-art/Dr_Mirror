import { AlertDialog, Button, Label, TextArea, TextField, useOverlayState } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useSubmitReturnMutation } from '../hooks';

const submitReturnSchema = z.object({
  customerReason: z.string().trim().min(1, 'reasonRequired').max(1000, 'reasonTooLong'),
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
    defaultValues: { customerReason: '' },
  });
  const pending = mutation.isPending || isSubmitting;
  const error = (message?: string) => (message ? t(`returns.errors.${message}`) : null);

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
                    await mutation.mutateAsync({ customerReason: values.customerReason.trim() });
                    reset();
                    close();
                  })}
                >
                  <AlertDialog.Header>
                    <AlertDialog.Heading>{t('returns.eligibility.title')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <Controller name="customerReason" control={control} render={({ field }) => (
                      <TextField isInvalid={Boolean(errors.customerReason)} className="flex flex-col gap-1">
                        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
                          {t('returns.form.reasonLabel')}
                        </Label>
                        <TextArea
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          rows={4}
                          maxLength={1000}
                          fullWidth
                          placeholder={t('returns.form.reasonPlaceholder')}
                          className="text-sm text-start border border-default-400 dark:border-default-300"
                        />
                        {errors.customerReason?.message ? (
                          <p role="alert" className="text-xs text-danger">{error(errors.customerReason.message)}</p>
                        ) : null}
                      </TextField>
                    )} />
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
