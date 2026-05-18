import { Button, Form, Label, NumberField } from '@heroui/react';
import { isAxiosError } from 'axios';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../../auth/types';
import {
  useCreateVariantMutation,
  useToggleVariantActiveMutation,
  useUpdateVariantMutation,
} from '../hooks';
import type { AdminProductDetailDto, AdminProductVariantDto } from '../types';

import { Field as SimpleField } from '../../../../shared/components/Field';

export function ProductVariantsSection({ product }: { product: AdminProductDetailDto }) {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <article className="rounded-large border border-divider/60 bg-content1 p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
          {t('admin.products.variants.heading')}
        </h2>
        {!showCreate ? (
          <Button variant="ghost" size="sm" onPress={() => setShowCreate(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" aria-hidden />
              {t('admin.products.variants.add')}
            </span>
          </Button>
        ) : null}
      </header>

      {showCreate ? (
        // eslint-disable-next-line i18next/no-literal-string -- programmatic form mode, not user copy
        <VariantForm productId={product.id} mode="create"
          onDone={() => setShowCreate(false)}
        />
      ) : null}

      {product.variants.length === 0 && !showCreate ? (
        <p className="rounded-medium border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          {t('admin.products.variants.emptyWarning')}
        </p>
      ) : (
        <ul className="space-y-2">
          {product.variants.map((v) => (
            <li key={v.id}>
              {editingId === v.id ? (
                // eslint-disable-next-line i18next/no-literal-string -- programmatic form mode, not user copy
                <VariantForm productId={product.id} mode="edit"
                  variant={v}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <VariantRow
                  productId={product.id}
                  variant={v}
                  onEdit={() => setEditingId(v.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function VariantRow({
  productId,
  variant,
  onEdit,
}: {
  productId: string;
  variant: AdminProductVariantDto;
  onEdit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const toggleMutation = useToggleVariantActiveMutation(productId);
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className={[
        'flex items-center justify-between gap-3 rounded-medium border p-3',
        variant.isActive ? 'border-divider/60 bg-content1' : 'border-divider/40 bg-default-100/50 opacity-70',
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="size-6 shrink-0 rounded-full ring-1 ring-default-200"
          style={{ backgroundColor: variant.colorHex }}
          aria-hidden
        />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">
            {variant.size} / {isAr ? variant.colorNameAr : variant.colorName}
          </p>
          <p className="font-mono text-xs text-default-500" dir="ltr">
            {variant.sku}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm tabular-nums">
          {t('admin.products.variants.stock', { count: variant.stock })}
        </span>
        <Button isIconOnly variant="ghost" size="md" onPress={onEdit} aria-label={t('admin.catalog.actions.edit')}>
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          isDisabled={toggleMutation.isPending}
          onPress={async () => {
            setError(null);
            try {
              await toggleMutation.mutateAsync({ variantId: variant.id, activate: !variant.isActive });
            } catch (err) {
              const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
              // eslint-disable-next-line i18next/no-literal-string -- fallback string for error display, not user copy
              setError(problem?.detail ?? problem?.title ?? 'error');
            }
          }}
        >
          {variant.isActive
            ? t('admin.catalog.actions.deactivate')
            : t('admin.catalog.actions.activate')}
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function VariantForm({
  productId,
  mode,
  variant,
  onDone,
}: {
  productId: string;
  mode: 'create' | 'edit';
  variant?: AdminProductVariantDto;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateVariantMutation(productId);
  const updateMutation = useUpdateVariantMutation(productId);
  const [size, setSize] = useState(variant?.size ?? '');
  const [colorName, setColorName] = useState(variant?.colorName ?? '');
  const [colorNameAr, setColorNameAr] = useState(variant?.colorNameAr ?? '');
  const [colorHex, setColorHex] = useState(variant?.colorHex ?? '#000000');
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [stock, setStock] = useState(variant?.stock ?? 0);
  const [error, setError] = useState<string | null>(null);

  const inFlight = createMutation.isPending || updateMutation.isPending;

  return (
    <Form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const body = {
          size: size.trim(),
          colorName: colorName.trim(),
          colorNameAr: colorNameAr.trim(),
          colorHex,
          sku: sku.trim(),
          stock,
        };
        try {
          if (mode === 'create') {
            await createMutation.mutateAsync(body);
          } else if (variant) {
            await updateMutation.mutateAsync({ variantId: variant.id, body });
          }
          onDone();
        } catch (err) {
          const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
          setError(problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'));
        }
      }}
      className="space-y-3 rounded-medium border border-primary/40 bg-primary/5 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_60px_1fr_100px]">
        <SimpleField label={t('admin.products.variants.size')} value={size} onChange={setSize} required maxLength={16} />
        <SimpleField label={t('admin.products.variants.colorName')} value={colorName} onChange={setColorName} required maxLength={60} />
        <SimpleField label={t('admin.products.variants.colorNameAr')} value={colorNameAr} onChange={setColorNameAr} required maxLength={60} />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">{t('admin.products.variants.hex')}</span>
          {/* intentional: HeroUI v3 has no color input — see DESIGN.md */}
          <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-9 w-full rounded-medium border border-divider bg-background"
          />
        </label>
        <SimpleField label={t('admin.products.variants.sku')} value={sku} onChange={setSku} required maxLength={64} dir="ltr" />
        <NumberField
          value={stock}
          minValue={0}
          maxValue={1_000_000}
          step={1}
          onChange={(next) => setStock(next ?? 0)}
          variant="secondary"
          className="text-sm"
        >
          <Label className="text-xs uppercase tracking-wide text-default-500">{t('admin.products.variants.stockLabel')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="tabular-nums" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isDisabled={inFlight}>
          {inFlight
            ? t('admin.catalog.actions.saving')
            : mode === 'create'
              ? t('admin.catalog.actions.create')
              : t('admin.catalog.actions.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={onDone} isDisabled={inFlight}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </Form>
  );
}
