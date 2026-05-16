import { Button, Spinner } from '@heroui/react';
import { isAxiosError } from 'axios';
import { Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';

import {
  useAdminCategoriesQuery,
  useCreateCategoryMutation,
  useToggleCategoryActiveMutation,
  useUpdateCategoryMutation,
} from './hooks';
import type { AdminCategoryDto } from './types';

/**
 * Admin categories at <c>/admin/categories</c>. Inline create (top row) +
 * inline edit (clicking the pencil expands the row into a form). No modals —
 * staff blast through this list quickly.
 */
export function AdminCategoriesPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const query = useAdminCategoriesQuery();
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const toggleMutation = useToggleCategoryActiveMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner aria-label={t('admin.catalog.loading')} />
      </div>
    );
  }

  const categories = query.data ?? [];

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('admin.catalog.categories.title')}
        </h1>
        <p className="text-sm text-default-500">
          {t('admin.catalog.categories.subtitle')}
        </p>
      </header>

      {serverError ? (
        <div role="alert" className="rounded-medium border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {serverError}
        </div>
      ) : null}

      <CreateCategoryForm
        onSubmit={async (body) => {
          setServerError(null);
          try {
            await createMutation.mutateAsync(body);
            return true;
          } catch (err) {
            const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
            setServerError(problem?.detail ?? problem?.title ?? t('admin.catalog.errors.unknown'));
            return false;
          }
        }}
        isPending={createMutation.isPending}
      />

      {categories.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
          {t('admin.catalog.categories.empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.id}>
              {editingId === cat.id ? (
                <EditCategoryRow
                  category={cat}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (body) => {
                    setServerError(null);
                    try {
                      await updateMutation.mutateAsync({ id: cat.id, body });
                      setEditingId(null);
                      return true;
                    } catch (err) {
                      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                      setServerError(
                        problem?.detail ?? problem?.title ?? t('admin.catalog.errors.unknown'),
                      );
                      return false;
                    }
                  }}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-medium border border-divider/60 bg-content1 p-3">
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
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
                        cat.isActive
                          ? 'border-success/30 bg-success/15 text-success'
                          : 'border-default/30 bg-default/10 text-default-500',
                      ].join(' ')}
                    >
                      {cat.isActive
                        ? t('admin.catalog.status.active')
                        : t('admin.catalog.status.inactive')}
                    </span>
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      onPress={() => setEditingId(cat.id)}
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
                            id: cat.id,
                            activate: !cat.isActive,
                          });
                        } catch (err) {
                          const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                          setServerError(
                            problem?.detail ?? problem?.title ?? t('admin.catalog.errors.unknown'),
                          );
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

function CreateCategoryForm({ onSubmit, isPending }: CategoryFormProps) {
  const { t } = useTranslation();
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onSubmit({ nameAr: nameAr.trim(), nameEn: nameEn.trim(), displayOrder });
        if (ok) {
          setNameAr('');
          setNameEn('');
          setDisplayOrder(0);
        }
      }}
      className="grid gap-3 rounded-large border border-divider/60 bg-content1 p-3 sm:grid-cols-[1fr_1fr_100px_auto]"
    >
      <input
        value={nameAr}
        onChange={(e) => setNameAr(e.target.value)}
        placeholder={t('admin.catalog.categories.nameAr')}
        className="rounded-medium border border-divider bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        required
        maxLength={120}
      />
      <input
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        placeholder={t('admin.catalog.categories.nameEn')}
        className="rounded-medium border border-divider bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        required
        maxLength={120}
      />
      <input
        type="number"
        min={0}
        max={9999}
        value={displayOrder}
        onChange={(e) => setDisplayOrder(Number.parseInt(e.target.value, 10) || 0)}
        aria-label={t('admin.catalog.categories.displayOrder')}
        className="rounded-medium border border-divider bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <Button type="submit" variant="primary" size="sm" isDisabled={isPending}>
        <span className="inline-flex items-center gap-1.5">
          <Plus className="size-4" aria-hidden />
          {isPending ? t('admin.catalog.actions.creating') : t('admin.catalog.actions.create')}
        </span>
      </Button>
    </form>
  );
}

interface EditCategoryRowProps extends CategoryFormProps {
  category: AdminCategoryDto;
  onCancel: () => void;
}

function EditCategoryRow({ category, onSubmit, onCancel, isPending }: EditCategoryRowProps) {
  const { t } = useTranslation();
  const [nameAr, setNameAr] = useState(category.nameAr);
  const [nameEn, setNameEn] = useState(category.nameEn);
  const [displayOrder, setDisplayOrder] = useState(category.displayOrder);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ nameAr: nameAr.trim(), nameEn: nameEn.trim(), displayOrder });
      }}
      className="grid gap-3 rounded-medium border border-primary/40 bg-primary/5 p-3 sm:grid-cols-[1fr_1fr_100px_auto_auto]"
    >
      <input
        value={nameAr}
        onChange={(e) => setNameAr(e.target.value)}
        className="rounded-medium border border-divider bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        required
        maxLength={120}
      />
      <input
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        className="rounded-medium border border-divider bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        required
        maxLength={120}
      />
      <input
        type="number"
        min={0}
        max={9999}
        value={displayOrder}
        onChange={(e) => setDisplayOrder(Number.parseInt(e.target.value, 10) || 0)}
        aria-label={t('admin.catalog.categories.displayOrder')}
        className="rounded-medium border border-divider bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <Button type="submit" variant="primary" size="sm" isDisabled={isPending}>
        {isPending ? t('admin.catalog.actions.saving') : t('admin.catalog.actions.save')}
      </Button>
      <Button type="button" variant="ghost" size="sm" onPress={onCancel} isDisabled={isPending}>
        {t('admin.catalog.actions.cancel')}
      </Button>
    </form>
  );
}
