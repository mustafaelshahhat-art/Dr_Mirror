import { Button, Fieldset, Form, Input, Label, TextField } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PAYMENT_METHOD_KIND, type PaymentMethodKind } from '../../../../orders/types';
import { Field, TextAreaField } from '../../../../../shared/components/Field';
import { SelectField } from '../../../../../shared/components/SelectField';
import type { AdminPaymentMethodDto } from '../../types';

export interface PaymentMethodCreateBody {
  code: string;
  kind: PaymentMethodKind;
  nameAr: string;
  nameEn: string;
  instructionsAr: string | null;
  instructionsEn: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  displayOrder: number;
}

export interface PaymentMethodEditBody {
  nameAr: string;
  nameEn: string;
  instructionsAr: string | null;
  instructionsEn: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  displayOrder: number;
}

interface CommonProps {
  onCancel: () => void;
  isPending: boolean;
}

interface CreateProps extends CommonProps {
  mode: 'create';
  initial?: undefined;
  onSubmit: (body: PaymentMethodCreateBody) => Promise<boolean>;
}

interface EditProps extends CommonProps {
  mode: 'edit';
  initial: AdminPaymentMethodDto;
  onSubmit: (body: PaymentMethodEditBody) => Promise<boolean>;
}

type Props = CreateProps | EditProps;

const paymentMethodSharedSchema = z.object({
  nameAr: z.string().trim().min(1, 'admin.payments.validation.nameArRequired').max(64, 'admin.payments.validation.nameArTooLong'),
  nameEn: z.string().trim().min(1, 'admin.payments.validation.nameEnRequired').max(64, 'admin.payments.validation.nameEnTooLong'),
  instructionsAr: z.string().trim().max(500, 'admin.payments.validation.instructionsArTooLong'),
  instructionsEn: z.string().trim().max(500, 'admin.payments.validation.instructionsEnTooLong'),
  accountNumber: z.string().trim().max(64, 'admin.payments.validation.accountNumberTooLong'),
  accountHolder: z.string().trim().max(100, 'admin.payments.validation.accountHolderTooLong'),
  displayOrder: z.number().int('admin.payments.validation.displayOrderInteger'),
});

const createSchema = paymentMethodSharedSchema.extend({
  code: z.string().trim().min(1, 'admin.payments.validation.codeRequired').max(32, 'admin.payments.validation.codeTooLong'),
  kind: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});

const editSchema = paymentMethodSharedSchema;

type PaymentMethodFormValues = z.infer<typeof paymentMethodSharedSchema> & {
  code: string;
  kind: PaymentMethodKind;
};

/**
 * Single form for both creating and editing a payment method. The `code` and
 * `kind` fields render only on create — they're immutable after the record
 * exists. Everything else is shared so we don't drift between two copies.
 */
export function PaymentMethodForm(props: Props) {
  const { t } = useTranslation();
  const isCreate = props.mode === 'create';
  const initial = isCreate ? undefined : props.initial;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(isCreate ? createSchema : editSchema) as unknown as Resolver<PaymentMethodFormValues>,
    defaultValues: {
      code: initial?.code ?? '',
      kind: initial?.kind ?? PAYMENT_METHOD_KIND.Cod,
      nameAr: initial?.nameAr ?? '',
      nameEn: initial?.nameEn ?? '',
      instructionsAr: initial?.instructionsAr ?? '',
      instructionsEn: initial?.instructionsEn ?? '',
      accountNumber: initial?.accountNumber ?? '',
      accountHolder: initial?.accountHolder ?? '',
      displayOrder: initial?.displayOrder ?? 0,
    },
  });
  const pending = props.isPending || isSubmitting;
  const error = (message?: string) => (message ? t(message) : null);
  const optional = (value: string) => value.trim() || null;

  return (
    <Form
      onSubmit={handleSubmit(async (values) => {
        const shared = {
          nameAr: values.nameAr.trim(),
          nameEn: values.nameEn.trim(),
          instructionsAr: optional(values.instructionsAr),
          instructionsEn: optional(values.instructionsEn),
          accountNumber: optional(values.accountNumber),
          accountHolder: optional(values.accountHolder),
          displayOrder: values.displayOrder,
        };

        if (props.mode === 'create') {
          const ok = await props.onSubmit({
            ...shared,
            code: values.code.trim(),
            kind: values.kind,
          });
          if (ok) {
            reset({
              code: '',
              kind: PAYMENT_METHOD_KIND.Cod,
              nameAr: '',
              nameEn: '',
              instructionsAr: '',
              instructionsEn: '',
              accountNumber: '',
              accountHolder: '',
              displayOrder: 0,
            });
          }
        } else {
          await props.onSubmit(shared);
        }
      })}
      className={
        isCreate
          ? 'space-y-3 rounded-large border border-primary/40 bg-primary/5 p-4'
          : 'space-y-3 rounded-medium border border-primary/40 bg-primary/5 p-3'
      }
    >
      {isCreate ? (
        <h2 className="text-sm font-semibold">{t('admin.payments.create.heading')}</h2>
      ) : (
        <p className="text-xs text-default-500">
          {t('admin.payments.editingNote', { code: initial!.code })}
        </p>
      )}

      {isCreate ? (
        <Fieldset>
          <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
            {t('admin.payments.sections.identity')}
          </Fieldset.Legend>
          <Fieldset.Group className="grid gap-3 sm:grid-cols-2">
            <Controller name="code" control={control} render={({ field }) => (
              <Field {...field} label={t('admin.payments.fields.code')} placeholder="bank-transfer" required maxLength={32} dir="ltr" errorMessage={error(errors.code?.message)} />
            )} />
            <Controller name="kind" control={control} render={({ field }) => (
              <SelectField
                label={t('admin.payments.fields.kind')}
                value={String(field.value)}
                onChange={(next) => field.onChange(Number(next) as PaymentMethodKind)}
                isRequired
                errorMessage={error(errors.kind?.message)}
                options={[
                  { value: String(PAYMENT_METHOD_KIND.Cod), label: t('admin.payments.kind.cod') },
                  { value: String(PAYMENT_METHOD_KIND.Instapay), label: t('admin.payments.kind.instapay') },
                  { value: String(PAYMENT_METHOD_KIND.Wallet), label: t('admin.payments.kind.wallet') },
                  { value: String(PAYMENT_METHOD_KIND.BankTransfer), label: t('admin.payments.kind.bankTransfer') },
                ]}
              />
            )} />
          </Fieldset.Group>
        </Fieldset>
      ) : null}

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('admin.payments.sections.display')}
        </Fieldset.Legend>
        <Fieldset.Group className="grid gap-3 sm:grid-cols-2">
          <Controller name="nameAr" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.payments.fields.nameAr')} required maxLength={64} errorMessage={error(errors.nameAr?.message)} />
          )} />
          <Controller name="nameEn" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.payments.fields.nameEn')} required maxLength={64} errorMessage={error(errors.nameEn?.message)} />
          )} />
          <TextField isInvalid={Boolean(errors.displayOrder)} className="flex flex-col gap-1">
            <Label className="sr-only">{t('admin.payments.fields.displayOrder')}</Label>
            <Controller name="displayOrder" control={control} render={({ field }) => (
              <Input
                type="number"
                value={String(field.value)}
                onChange={(e) => field.onChange(Number.parseInt((e.target as HTMLInputElement).value, 10) || 0)}
                aria-label={t('admin.payments.fields.displayOrder')}
                className="tabular-nums"
              />
            )} />
            {errors.displayOrder?.message ? <p className="text-xs text-danger">{error(errors.displayOrder.message)}</p> : null}
          </TextField>
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('admin.payments.sections.instructions')}
        </Fieldset.Legend>
        <Fieldset.Group className="grid gap-3 sm:grid-cols-2">
          <Controller name="instructionsAr" control={control} render={({ field }) => (
            <TextAreaField {...field} label={t('admin.payments.fields.instructionsAr')} maxLength={500} rows={2} errorMessage={error(errors.instructionsAr?.message)} />
          )} />
          <Controller name="instructionsEn" control={control} render={({ field }) => (
            <TextAreaField {...field} label={t('admin.payments.fields.instructionsEn')} maxLength={500} rows={2} errorMessage={error(errors.instructionsEn?.message)} />
          )} />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('admin.payments.sections.account')}
        </Fieldset.Legend>
        <Fieldset.Group className="grid gap-3 sm:grid-cols-2">
          <Controller name="accountNumber" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.payments.fields.accountNumber')} maxLength={64} dir="ltr" errorMessage={error(errors.accountNumber?.message)} />
          )} />
          <Controller name="accountHolder" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.payments.fields.accountHolder')} maxLength={100} errorMessage={error(errors.accountHolder?.message)} />
          )} />
        </Fieldset.Group>
      </Fieldset>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isPending={pending}>
          {pending
            ? isCreate
              ? t('admin.catalog.actions.creating')
              : t('admin.catalog.actions.saving')
            : isCreate
              ? t('admin.catalog.actions.create')
              : t('admin.catalog.actions.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={props.onCancel} isDisabled={pending}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </Form>
  );
}
