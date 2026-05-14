import { Button, Spinner } from '@heroui/react';
import { isAxiosError } from 'axios';
import { Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';
import { PAYMENT_METHOD_KIND, type PaymentMethodKind } from '../../orders/types';

import {
  useAdminPaymentMethodsQuery,
  useCreatePaymentMethodMutation,
  useTogglePaymentMethodActiveMutation,
  useUpdatePaymentMethodMutation,
} from './hooks';
import type { AdminPaymentMethodDto } from './types';

const KIND_LABEL_KEY: Record<PaymentMethodKind, string> = {
  0: 'admin.payments.kind.cod',
  1: 'admin.payments.kind.instapay',
  2: 'admin.payments.kind.wallet',
  3: 'admin.payments.kind.bankTransfer',
};

/**
 * Admin payment methods at <c>/admin/payment-methods</c>. Same inline pattern
 * as <c>AdminCategoriesPage</c>. <c>Code</c> and <c>Kind</c> are immutable on
 * update — snapshotted into order history.
 */
export function AdminPaymentMethodsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const query = useAdminPaymentMethodsQuery();
  const createMutation = useCreatePaymentMethodMutation();
  const updateMutation = useUpdatePaymentMethodMutation();
  const toggleMutation = useTogglePaymentMethodActiveMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner aria-label={t('admin.payments.loading')} />
      </div>
    );
  }

  const methods = query.data ?? [];

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.payments.title')}</h1>
          <p className="text-sm text-default-500">{t('admin.payments.subtitle')}</p>
        </div>
        {!creating ? (
          <Button variant="primary" size="sm" onPress={() => setCreating(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" aria-hidden />
              {t('admin.payments.actions.new')}
            </span>
          </Button>
        ) : null}
      </header>

      {serverError ? (
        <div role="alert" className="rounded-medium border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {serverError}
        </div>
      ) : null}

      {creating ? (
        <PaymentMethodCreateForm
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            setServerError(null);
            try {
              await createMutation.mutateAsync(body);
              setCreating(false);
              return true;
            } catch (err) {
              const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
              setServerError(
                problem?.detail ?? problem?.title ?? t('admin.payments.errors.unknown'),
              );
              return false;
            }
          }}
          isPending={createMutation.isPending}
        />
      ) : null}

      {methods.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
          {t('admin.payments.empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {methods.map((m) => (
            <li key={m.id}>
              {editingId === m.id ? (
                <PaymentMethodEditForm
                  method={m}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (body) => {
                    setServerError(null);
                    try {
                      await updateMutation.mutateAsync({ id: m.id, body });
                      setEditingId(null);
                      return true;
                    } catch (err) {
                      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                      setServerError(
                        problem?.detail ?? problem?.title ?? t('admin.payments.errors.unknown'),
                      );
                      return false;
                    }
                  }}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <div className="rounded-medium border border-divider/60 bg-content1 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {isAr ? m.nameAr : m.nameEn}
                        </span>
                        <span className="font-mono text-xs text-default-500">{m.code}</span>
                        <span className="text-xs text-default-500">·</span>
                        <span className="text-xs text-default-500">{t(KIND_LABEL_KEY[m.kind])}</span>
                        <span
                          className={[
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
                            m.isActive
                              ? 'border-success/30 bg-success/15 text-success'
                              : 'border-default/30 bg-default/10 text-default-500',
                          ].join(' ')}
                        >
                          {m.isActive
                            ? t('admin.catalog.status.active')
                            : t('admin.catalog.status.inactive')}
                        </span>
                      </div>
                      {m.accountNumber ? (
                        <p className="font-mono text-xs text-default-500" dir="ltr">
                          {m.accountNumber}
                          {m.accountHolder ? ` — ${m.accountHolder}` : ''}
                        </p>
                      ) : null}
                      <p className="text-xs text-default-500">
                        {t('admin.payments.orderCount', { count: m.orderCount })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        onPress={() => setEditingId(m.id)}
                        aria-label={t('admin.catalog.actions.edit')}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        isDisabled={toggleMutation.isPending}
                        onPress={async () => {
                          setServerError(null);
                          try {
                            await toggleMutation.mutateAsync({
                              id: m.id,
                              activate: !m.isActive,
                            });
                          } catch (err) {
                            const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                            setServerError(
                              problem?.detail ?? problem?.title ?? t('admin.payments.errors.unknown'),
                            );
                          }
                        }}
                        aria-label={
                          m.isActive
                            ? t('admin.catalog.actions.deactivate')
                            : t('admin.catalog.actions.activate')
                        }
                      >
                        {m.isActive ? (
                          <ToggleRight className="size-4 text-success" aria-hidden />
                        ) : (
                          <ToggleLeft className="size-4 text-default-400" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface CreateProps {
  onCancel: () => void;
  onSubmit: (body: {
    code: string;
    kind: PaymentMethodKind;
    nameAr: string;
    nameEn: string;
    instructionsAr: string | null;
    instructionsEn: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
    displayOrder: number;
  }) => Promise<boolean>;
  isPending: boolean;
}

function PaymentMethodCreateForm({ onCancel, onSubmit, isPending }: CreateProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<PaymentMethodKind>(PAYMENT_METHOD_KIND.Cod);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [instructionsAr, setInstructionsAr] = useState('');
  const [instructionsEn, setInstructionsEn] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onSubmit({
          code: code.trim(),
          kind,
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim(),
          instructionsAr: instructionsAr.trim() || null,
          instructionsEn: instructionsEn.trim() || null,
          accountNumber: accountNumber.trim() || null,
          accountHolder: accountHolder.trim() || null,
          displayOrder,
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
      }}
      className="space-y-3 rounded-large border border-primary/40 bg-primary/5 p-4"
    >
      <h2 className="text-sm font-semibold">{t('admin.payments.create.heading')}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledInput
          label={t('admin.payments.fields.code')}
          value={code}
          onChange={setCode}
          placeholder="bank-transfer"
          required
          maxLength={32}
          dir="ltr"
        />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">
            {t('admin.payments.fields.kind')}
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(Number(e.target.value) as PaymentMethodKind)}
            className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
          >
            <option value={PAYMENT_METHOD_KIND.Cod}>{t('admin.payments.kind.cod')}</option>
            <option value={PAYMENT_METHOD_KIND.Instapay}>{t('admin.payments.kind.instapay')}</option>
            <option value={PAYMENT_METHOD_KIND.Wallet}>{t('admin.payments.kind.wallet')}</option>
            <option value={PAYMENT_METHOD_KIND.BankTransfer}>{t('admin.payments.kind.bankTransfer')}</option>
          </select>
        </label>
        <LabeledInput label={t('admin.payments.fields.nameAr')} value={nameAr} onChange={setNameAr} required maxLength={64} />
        <LabeledInput label={t('admin.payments.fields.nameEn')} value={nameEn} onChange={setNameEn} required maxLength={64} />
        <LabeledTextarea label={t('admin.payments.fields.instructionsAr')} value={instructionsAr} onChange={setInstructionsAr} maxLength={500} />
        <LabeledTextarea label={t('admin.payments.fields.instructionsEn')} value={instructionsEn} onChange={setInstructionsEn} maxLength={500} />
        <LabeledInput label={t('admin.payments.fields.accountNumber')} value={accountNumber} onChange={setAccountNumber} maxLength={64} dir="ltr" />
        <LabeledInput label={t('admin.payments.fields.accountHolder')} value={accountHolder} onChange={setAccountHolder} maxLength={100} />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">
            {t('admin.payments.fields.displayOrder')}
          </span>
          <input
            type="number"
            min={0}
            max={999}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number.parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm tabular-nums"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isDisabled={isPending}>
          {isPending ? t('admin.catalog.actions.creating') : t('admin.catalog.actions.create')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={onCancel} isDisabled={isPending}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </form>
  );
}

interface EditProps {
  method: AdminPaymentMethodDto;
  onCancel: () => void;
  onSubmit: (body: {
    nameAr: string;
    nameEn: string;
    instructionsAr: string | null;
    instructionsEn: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
    displayOrder: number;
  }) => Promise<boolean>;
  isPending: boolean;
}

function PaymentMethodEditForm({ method, onCancel, onSubmit, isPending }: EditProps) {
  const { t } = useTranslation();
  const [nameAr, setNameAr] = useState(method.nameAr);
  const [nameEn, setNameEn] = useState(method.nameEn);
  const [instructionsAr, setInstructionsAr] = useState(method.instructionsAr ?? '');
  const [instructionsEn, setInstructionsEn] = useState(method.instructionsEn ?? '');
  const [accountNumber, setAccountNumber] = useState(method.accountNumber ?? '');
  const [accountHolder, setAccountHolder] = useState(method.accountHolder ?? '');
  const [displayOrder, setDisplayOrder] = useState(method.displayOrder);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim(),
          instructionsAr: instructionsAr.trim() || null,
          instructionsEn: instructionsEn.trim() || null,
          accountNumber: accountNumber.trim() || null,
          accountHolder: accountHolder.trim() || null,
          displayOrder,
        });
      }}
      className="space-y-3 rounded-medium border border-primary/40 bg-primary/5 p-3"
    >
      <p className="text-xs text-default-500">
        {t('admin.payments.editingNote', { code: method.code })}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledInput label={t('admin.payments.fields.nameAr')} value={nameAr} onChange={setNameAr} required maxLength={64} />
        <LabeledInput label={t('admin.payments.fields.nameEn')} value={nameEn} onChange={setNameEn} required maxLength={64} />
        <LabeledTextarea label={t('admin.payments.fields.instructionsAr')} value={instructionsAr} onChange={setInstructionsAr} maxLength={500} />
        <LabeledTextarea label={t('admin.payments.fields.instructionsEn')} value={instructionsEn} onChange={setInstructionsEn} maxLength={500} />
        <LabeledInput label={t('admin.payments.fields.accountNumber')} value={accountNumber} onChange={setAccountNumber} maxLength={64} dir="ltr" />
        <LabeledInput label={t('admin.payments.fields.accountHolder')} value={accountHolder} onChange={setAccountHolder} maxLength={100} />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">
            {t('admin.payments.fields.displayOrder')}
          </span>
          <input
            type="number"
            min={0}
            max={999}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number.parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm tabular-nums"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isDisabled={isPending}>
          {isPending ? t('admin.catalog.actions.saving') : t('admin.catalog.actions.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={onCancel} isDisabled={isPending}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </form>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  required,
  maxLength,
  placeholder,
  dir,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-default-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="space-y-1 text-sm sm:col-span-2">
      <span className="text-xs uppercase tracking-wide text-default-500">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={2}
        className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
      />
    </label>
  );
}
