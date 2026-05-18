import { Button, Form, Input, Label, TextField } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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

/**
 * Single form for both creating and editing a payment method. The `code` and
 * `kind` fields render only on create — they're immutable after the record
 * exists. Everything else is shared so we don't drift between two copies.
 */
export function PaymentMethodForm(props: Props) {
  const { t } = useTranslation();
  const isCreate = props.mode === 'create';
  const initial = isCreate ? undefined : props.initial;

  const [code, setCode] = useState(initial?.code ?? '');
  const [kind, setKind] = useState<PaymentMethodKind>(
    initial?.kind ?? PAYMENT_METHOD_KIND.Cod,
  );
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? '');
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '');
  const [instructionsAr, setInstructionsAr] = useState(initial?.instructionsAr ?? '');
  const [instructionsEn, setInstructionsEn] = useState(initial?.instructionsEn ?? '');
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? '');
  const [accountHolder, setAccountHolder] = useState(initial?.accountHolder ?? '');
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);

  return (
    <Form
      onSubmit={async (e) => {
        e.preventDefault();
        const shared = {
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim(),
          instructionsAr: instructionsAr.trim() || null,
          instructionsEn: instructionsEn.trim() || null,
          accountNumber: accountNumber.trim() || null,
          accountHolder: accountHolder.trim() || null,
          displayOrder,
        };

        if (props.mode === 'create') {
          const ok = await props.onSubmit({
            ...shared,
            code: code.trim(),
            kind,
          });
          if (ok) {
            setCode('');
            setKind(PAYMENT_METHOD_KIND.Cod);
            setNameAr('');
            setNameEn('');
            setInstructionsAr('');
            setInstructionsEn('');
            setAccountNumber('');
            setAccountHolder('');
            setDisplayOrder(0);
          }
        } else {
          await props.onSubmit(shared);
        }
      }}
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

      <div className="grid gap-3 sm:grid-cols-2">
        {isCreate ? (
          <>
            <Field
              label={t('admin.payments.fields.code')}
              value={code}
              onChange={setCode}
              placeholder="bank-transfer"
              required
              maxLength={32}
              dir="ltr"
            />
            <SelectField
              label={t('admin.payments.fields.kind')}
              value={String(kind)}
              onChange={(next) => setKind(Number(next) as PaymentMethodKind)}
              options={[
                { value: String(PAYMENT_METHOD_KIND.Cod), label: t('admin.payments.kind.cod') },
                { value: String(PAYMENT_METHOD_KIND.Instapay), label: t('admin.payments.kind.instapay') },
                { value: String(PAYMENT_METHOD_KIND.Wallet), label: t('admin.payments.kind.wallet') },
                { value: String(PAYMENT_METHOD_KIND.BankTransfer), label: t('admin.payments.kind.bankTransfer') },
              ]}
            />
          </>
        ) : null}
        <Field label={t('admin.payments.fields.nameAr')} value={nameAr} onChange={setNameAr} required maxLength={64} />
        <Field label={t('admin.payments.fields.nameEn')} value={nameEn} onChange={setNameEn} required maxLength={64} />
        <TextAreaField label={t('admin.payments.fields.instructionsAr')} value={instructionsAr} onChange={setInstructionsAr} maxLength={500} rows={2} />
        <TextAreaField label={t('admin.payments.fields.instructionsEn')} value={instructionsEn} onChange={setInstructionsEn} maxLength={500} rows={2} />
        <Field label={t('admin.payments.fields.accountNumber')} value={accountNumber} onChange={setAccountNumber} maxLength={64} dir="ltr" />
        <Field label={t('admin.payments.fields.accountHolder')} value={accountHolder} onChange={setAccountHolder} maxLength={100} />
        <TextField className="flex flex-col gap-1">
          <Label className="sr-only">{t('admin.payments.fields.displayOrder')}</Label>
          <Input
            type="number"
            value={String(displayOrder)}
            onChange={(e) => setDisplayOrder(Number.parseInt((e.target as HTMLInputElement).value, 10) || 0)}
            aria-label={t('admin.payments.fields.displayOrder')}
            className="tabular-nums"
          />
        </TextField>
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isPending={props.isPending}>
          {props.isPending
            ? isCreate
              ? t('admin.catalog.actions.creating')
              : t('admin.catalog.actions.saving')
            : isCreate
              ? t('admin.catalog.actions.create')
              : t('admin.catalog.actions.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={props.onCancel} isDisabled={props.isPending}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </Form>
  );
}
