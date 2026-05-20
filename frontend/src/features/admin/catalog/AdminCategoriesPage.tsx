import { Button, Form, Input, Label, Switch, TextField, Tooltip } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderTree, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PageHeader } from '../../../shared/components/PageHeader';
import { QueryErrorState } from '../../../shared/components/QueryErrorState';
import { Skeleton } from '../../../shared/components/Skeleton';

import {
  useAdminCategoriesQuery,
  useCreateCategoryMutation,
  useToggleCategoryActiveMutation,
  useUpdateCategoryMutation,
} from './hooks';
import type { AdminCategoryDto } from './types';

export function AdminCategoriesPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const query = useAdminCategoriesQuery();
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const toggleMutation = useToggleCategoryActiveMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (query.isLoading) {
    return (
      <section
        className="space-y-8"
        aria-busy="true"
        aria-label={t('admin.catalog.loading')}
      >
        <header className="space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </header>
        <Skeleton className="h-16 w-full rounded-large" />
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-large border border-divider/60 bg-surface p-3"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="space-y-8">
        <PageHeader title={t('admin.catalog.categories.title')} subtitle={t('admin.catalog.categories.subtitle')} />
        <QueryErrorState
          message={t('admin.catalog.categories.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  const categories = query.data ?? [];

  return (
    <section className="space-y-8">
      <PageHeader
        title={t('admin.catalog.categories.title')}
        subtitle={t('admin.catalog.categories.subtitle')}
        action={
          !isCreating ? (
            <Button
              variant="primary"
              size="sm"
              onPress={() => setIsCreating(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="size-4" aria-hidden />
                {t('admin.catalog.actions.create')}
              </span>
            </Button>
          ) : undefined
        }
      />

      {isCreating ? (
        <CreateCategoryForm
          onSubmit={async (body) => {
            try {
              await createMutation.mutateAsync(body);
              setIsCreating(false);
              return true;
            } catch {
              // Toast emitted by mutation onError.
              return false;
            }
          }}
          onCancel={() => setIsCreating(false)}
          isPending={createMutation.isPending}
        />
      ) : null}

      {categories.length === 0 ? (
        <div className="content-surface p-10 text-center">
          <FolderTree className="enter-fade-up mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="enter-fade-up text-sm text-default-500">{t('admin.catalog.categories.empty')}</p>
        </div>
      ) : (
        <ul
          className="space-y-2"
          aria-busy={
            query.isFetching ||
            createMutation.isPending ||
            updateMutation.isPending ||
            toggleMutation.isPending
          }
        >
          {categories.map((cat) => (
            <li key={cat.id}>
              {editingId === cat.id ? (
                <EditCategoryRow
                  category={cat}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (body) => {
                    try {
                      await updateMutation.mutateAsync({ id: cat.id, body });
                      setEditingId(null);
                      return true;
                    } catch {
                      // Toast emitted by mutation onError.
                      return false;
                    }
                  }}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <div className="content-surface flex flex-row items-start justify-between gap-3 p-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 space-y-0.5 text-start"
                    onClick={() => setEditingId(cat.id)}
                    aria-label={`${t('admin.catalog.actions.edit')}: ${isAr ? cat.nameAr : cat.nameEn}`}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {isAr ? cat.nameAr : cat.nameEn}
                    </p>
                    <p className="text-xs text-default-500">
                      {t('admin.catalog.categories.productCount', { count: cat.productCount })}
                      {' · '}
                      {t('admin.catalog.categories.displayOrder')} {cat.displayOrder}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
                        cat.isActive
                          ? 'border-success/30 bg-success/15 text-success'
                          : 'border-divider/60 bg-content2 text-default-500',
                      ].join(' ')}
                    >
                      {cat.isActive
                        ? t('admin.catalog.status.active')
                        : t('admin.catalog.status.inactive')}
                    </span>
                    <Tooltip delay={300} closeDelay={0}>
                      <Switch
                        size="sm"
                        isSelected={cat.isActive}
                        isDisabled={toggleMutation.isPending}
                        onChange={async () => {
                          try {
                            await toggleMutation.mutateAsync({
                              id: cat.id,
                              activate: !cat.isActive,
                            });
                          } catch {
                            // Toast emitted by mutation onError.
                          }
                        }}
                        aria-label={
                          cat.isActive
                            ? t('admin.catalog.actions.deactivate')
                            : t('admin.catalog.actions.activate')
                        }
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                      <Tooltip.Content placement="top">
                        {cat.isActive
                          ? t('admin.catalog.actions.deactivate')
                          : t('admin.catalog.actions.activate')}
                      </Tooltip.Content>
                    </Tooltip>
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

interface CategoryFormProps {
  onSubmit: (body: { nameAr: string; nameEn: string; displayOrder: number }) => Promise<boolean>;
  onCancel?: () => void;
  isPending: boolean;
}

const categoryFormSchema = z.object({
  nameAr: z.string().trim().min(1, 'admin.catalog.validation.nameArRequired').max(120, 'admin.catalog.validation.nameArTooLong'),
  nameEn: z.string().trim().min(1, 'admin.catalog.validation.nameEnRequired').max(120, 'admin.catalog.validation.nameEnTooLong'),
  displayOrder: z.number().int('admin.catalog.validation.displayOrderInteger'),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function CreateCategoryForm({ onSubmit, onCancel, isPending }: CategoryFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { nameAr: '', nameEn: '', displayOrder: 0 },
  });
  const pending = isPending || isSubmitting;
  const error = (message?: string) => (message ? t(message) : null);

  return (
    <Form
      onSubmit={handleSubmit(async (values) => {
        const ok = await onSubmit({
          nameAr: values.nameAr.trim(),
          nameEn: values.nameEn.trim(),
          displayOrder: values.displayOrder,
        });
        if (ok) {
          reset();
        }
      })}
      className="content-surface flex flex-col gap-3 p-3 sm:grid sm:grid-cols-[1fr_1fr_100px_auto_auto] sm:items-end"
    >
      <TextField isRequired isInvalid={Boolean(errors.nameAr)} className="flex flex-col gap-1">
        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
          {t('admin.catalog.categories.nameAr')}
        </Label>
        <Input
          {...register('nameAr')}
          maxLength={120}
        />
        {errors.nameAr?.message ? <p className="text-xs text-danger">{error(errors.nameAr.message)}</p> : null}
      </TextField>
      <TextField isRequired isInvalid={Boolean(errors.nameEn)} className="flex flex-col gap-1">
        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
          {t('admin.catalog.categories.nameEn')}
        </Label>
        <Input
          {...register('nameEn')}
          maxLength={120}
        />
        {errors.nameEn?.message ? <p className="text-xs text-danger">{error(errors.nameEn.message)}</p> : null}
      </TextField>
      <TextField isInvalid={Boolean(errors.displayOrder)} className="flex flex-col gap-1">
        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
          {t('admin.catalog.categories.displayOrder')}
        </Label>
        <Input
          type="number"
          {...register('displayOrder', { valueAsNumber: true })}
          className="tabular-nums"
        />
        {errors.displayOrder?.message ? <p className="text-xs text-danger">{error(errors.displayOrder.message)}</p> : null}
      </TextField>
      <Button type="submit" variant="primary" size="sm" isPending={pending}>
        <span className="inline-flex items-center gap-1.5">
          <Plus className="size-4" aria-hidden />
          {pending ? t('admin.catalog.actions.creating') : t('admin.catalog.actions.create')}
        </span>
      </Button>
      {onCancel ? (
        <Button type="button" variant="ghost" size="sm" onPress={onCancel} isDisabled={pending}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      ) : null}
    </Form>
  );
}

interface EditCategoryRowProps extends CategoryFormProps {
  category: AdminCategoryDto;
  onCancel: () => void;
}

function EditCategoryRow({ category, onSubmit, onCancel, isPending }: EditCategoryRowProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      displayOrder: category.displayOrder,
    },
  });
  const pending = isPending || isSubmitting;
  const error = (message?: string) => (message ? t(message) : null);

  return (
    <Form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          nameAr: values.nameAr.trim(),
          nameEn: values.nameEn.trim(),
          displayOrder: values.displayOrder,
        });
      })}
      className="flex flex-col gap-3 rounded-large border border-primary/30 bg-primary/5 p-3 sm:grid sm:grid-cols-[1fr_1fr_100px_auto_auto] sm:items-end"
    >
      <TextField isRequired isInvalid={Boolean(errors.nameAr)} className="flex flex-col gap-1">
        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
          {t('admin.catalog.categories.nameAr')}
        </Label>
        <Input
          {...register('nameAr')}
          maxLength={120}
        />
        {errors.nameAr?.message ? <p className="text-xs text-danger">{error(errors.nameAr.message)}</p> : null}
      </TextField>
      <TextField isRequired isInvalid={Boolean(errors.nameEn)} className="flex flex-col gap-1">
        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
          {t('admin.catalog.categories.nameEn')}
        </Label>
        <Input
          {...register('nameEn')}
          maxLength={120}
        />
        {errors.nameEn?.message ? <p className="text-xs text-danger">{error(errors.nameEn.message)}</p> : null}
      </TextField>
      <TextField isInvalid={Boolean(errors.displayOrder)} className="flex flex-col gap-1">
        <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
          {t('admin.catalog.categories.displayOrder')}
        </Label>
        <Input
          type="number"
          {...register('displayOrder', { valueAsNumber: true })}
          className="tabular-nums"
        />
        {errors.displayOrder?.message ? <p className="text-xs text-danger">{error(errors.displayOrder.message)}</p> : null}
      </TextField>
      <Button type="submit" variant="primary" size="sm" isPending={pending}>
        {pending ? t('admin.catalog.actions.saving') : t('admin.catalog.actions.save')}
      </Button>
      <Button type="button" variant="ghost" size="sm" onPress={onCancel} isDisabled={pending}>
        {t('admin.catalog.actions.cancel')}
      </Button>
    </Form>
  );
}
