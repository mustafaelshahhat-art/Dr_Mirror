import { Button, Form, Input, Label, TextField, Tooltip } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderTree, Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

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
              className="flex items-center justify-between rounded-medium border border-divider/60 bg-content1 p-3"
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
        <header className="page-header">
          <h1 className="page-title">{t('admin.catalog.categories.title')}</h1>
          <p className="page-subtitle">{t('admin.catalog.categories.subtitle')}</p>
        </header>
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
      <header className="page-header">
        <h1 className="page-title">{t('admin.catalog.categories.title')}</h1>
        <p className="page-subtitle">{t('admin.catalog.categories.subtitle')}</p>
      </header>

      <CreateCategoryForm
        onSubmit={async (body) => {
          try {
            await createMutation.mutateAsync(body);
            return true;
          } catch {
            // Toast emitted by mutation onError.
            return false;
          }
        }}
        isPending={createMutation.isPending}
      />

      {categories.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
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
                <div className="flex flex-col gap-2 rounded-medium border border-divider/60 bg-content1 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {isAr ? cat.nameAr : cat.nameEn}
                    </p>
                    <p className="text-xs text-default-500" dir="ltr">
                      /{cat.slug}
                    </p>
                    <p className="text-xs text-default-500">
                      {t('admin.catalog.categories.productCount', { count: cat.productCount })}
                      {' · '}
                      {t('admin.catalog.categories.displayOrder')} {cat.displayOrder}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={[
                        'inline-flex items-center rounded-medium border px-2 py-0.5 text-xs font-medium leading-none',
                        cat.isActive
                          ? 'border-success/30 bg-success/15 text-success'
                          : 'border-divider/60 bg-content2 text-default-500',
                      ].join(' ')}
                    >
                      {cat.isActive
                        ? t('admin.catalog.status.active')
                        : t('admin.catalog.status.inactive')}
                    </span>
                    <Tooltip>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="md"
                        onPress={() => setEditingId(cat.id)}
                        aria-label={t('admin.catalog.actions.edit')}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Tooltip.Content placement="top">{t('admin.catalog.actions.edit')}</Tooltip.Content>
                    </Tooltip>
                    <Tooltip>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="md"
                        isDisabled={toggleMutation.isPending}
                        onPress={async () => {
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
                        {cat.isActive ? (
                          <ToggleRight className="size-4 text-success" aria-hidden />
                        ) : (
                          <ToggleLeft className="size-4 text-default-400" aria-hidden />
                        )}
                      </Button>
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
  isPending: boolean;
}

const categoryFormSchema = z.object({
  nameAr: z.string().trim().min(1, 'admin.catalog.validation.nameArRequired').max(120, 'admin.catalog.validation.nameArTooLong'),
  nameEn: z.string().trim().min(1, 'admin.catalog.validation.nameEnRequired').max(120, 'admin.catalog.validation.nameEnTooLong'),
  displayOrder: z.number().int('admin.catalog.validation.displayOrderInteger'),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function CreateCategoryForm({ onSubmit, isPending }: CategoryFormProps) {
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
      className="flex flex-col gap-3 rounded-large border border-divider/60 bg-content1 p-3 sm:grid sm:grid-cols-[1fr_1fr_100px_auto] sm:items-end"
    >
      <TextField isRequired isInvalid={Boolean(errors.nameAr)} className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wide text-default-500">
          {t('admin.catalog.categories.nameAr')}
        </Label>
        <Input
          {...register('nameAr')}
          maxLength={120}
        />
        {errors.nameAr?.message ? <p className="text-xs text-danger">{error(errors.nameAr.message)}</p> : null}
      </TextField>
      <TextField isRequired isInvalid={Boolean(errors.nameEn)} className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wide text-default-500">
          {t('admin.catalog.categories.nameEn')}
        </Label>
        <Input
          {...register('nameEn')}
          maxLength={120}
        />
        {errors.nameEn?.message ? <p className="text-xs text-danger">{error(errors.nameEn.message)}</p> : null}
      </TextField>
      <TextField isInvalid={Boolean(errors.displayOrder)} className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wide text-default-500">
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
      className="flex flex-col gap-3 rounded-medium border border-primary/40 bg-primary/5 p-3 sm:grid sm:grid-cols-[1fr_1fr_100px_auto_auto] sm:items-end"
    >
      <TextField isRequired isInvalid={Boolean(errors.nameAr)} className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wide text-default-500">
          {t('admin.catalog.categories.nameAr')}
        </Label>
        <Input
          {...register('nameAr')}
          maxLength={120}
        />
        {errors.nameAr?.message ? <p className="text-xs text-danger">{error(errors.nameAr.message)}</p> : null}
      </TextField>
      <TextField isRequired isInvalid={Boolean(errors.nameEn)} className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wide text-default-500">
          {t('admin.catalog.categories.nameEn')}
        </Label>
        <Input
          {...register('nameEn')}
          maxLength={120}
        />
        {errors.nameEn?.message ? <p className="text-xs text-danger">{error(errors.nameEn.message)}</p> : null}
      </TextField>
      <TextField isInvalid={Boolean(errors.displayOrder)} className="flex flex-col gap-1">
        <Label className="text-xs uppercase tracking-wide text-default-500">
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
