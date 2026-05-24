import { Button, Card } from '@heroui/react';
import { ArrowLeft, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { PageHeader } from '../../shared/components/PageHeader';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { AddressCardSkeleton, Skeleton } from '../../shared/components/Skeleton';
import { AddressForm } from './components/AddressForm';
import {
  useAddressesQuery,
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
  useUpdateAddressMutation,
} from './hooks';
import type { BuyerAddressDto } from './types';

/**
 * Buyer's saved address book at <c>/account/addresses</c>. List + add + edit
 * + delete + set-default. Hard-delete is safe because orders snapshot the
 * address inline.
 */
export function AddressBookPage() {
  const { t } = useTranslation();
  const query = useAddressesQuery();
  const createMutation = useCreateAddressMutation();
  const updateMutation = useUpdateAddressMutation();
  const deleteMutation = useDeleteAddressMutation();
  const setDefaultMutation = useSetDefaultAddressMutation();

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <section className="space-y-8" aria-busy="true" aria-label={t('addresses.loading')}>
        <header className="space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </header>
        <ul className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i}>
              <AddressCardSkeleton />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="space-y-8">
        <Link to="/account" className="back-link">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('addresses.backToAccount')}
        </Link>
        <PageHeader title={t('addresses.title')} subtitle={t('addresses.subtitle')} />
        <QueryErrorState
          message={t('addresses.errors.unknown')}
          retryLabel={t('common.query.retry')}
          onRetry={() => void query.refetch()}
          error={query.error}
        />
      </section>
    );
  }

  const addresses = query.data ?? [];
  const isFirstAddress = addresses.length === 0;

  return (
    <section className="space-y-8">
      <Link to="/account" className="back-link">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('addresses.backToAccount')}
      </Link>

      <PageHeader
        title={t('addresses.title')}
        subtitle={t('addresses.subtitle')}
        action={
          !creating && !isFirstAddress ? (
            <Button variant="primary" size="sm" onPress={() => setCreating(true)}>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="size-4" aria-hidden />
                {t('addresses.actions.add')}
              </span>
            </Button>
          ) : undefined
        }
      />

      {(creating || isFirstAddress) ? (
        <AddressForm
          isFirstAddress={isFirstAddress}
          submitLabel={t('addresses.actions.create')}
          pendingLabel={t('addresses.actions.creating')}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            await createMutation.mutateAsync(body);
            setCreating(false);
          }}
        />
      ) : null}

      {addresses.length === 0 && !creating ? (
        <EmptyState
          icon={MapPin}
          title={t('addresses.emptyTitle')}
          subtitle={t('addresses.emptySubtitle')}
          action={{
            label: t('addresses.actions.add'),
            onPress: () => setCreating(true)
          }}
        />
      ) : (
        <ul
          className="space-y-2"
          aria-busy={
            query.isFetching ||
            deleteMutation.isPending ||
            setDefaultMutation.isPending ||
            updateMutation.isPending
          }
        >
          {addresses.map((a) => (
            <li key={a.id}>
              {editingId === a.id ? (
                <AddressForm
                  initial={a}
                  submitLabel={t('addresses.actions.save')}
                  pendingLabel={t('addresses.actions.saving')}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (body) => {
                    await updateMutation.mutateAsync({ id: a.id, body });
                    setEditingId(null);
                  }}
                />
              ) : (
                <AddressCard
                  address={a}
                  onEdit={() => setEditingId(a.id)}
                  onDelete={() => setConfirmingDeleteId(a.id)}
                  onConfirmDelete={() => {
                    void deleteMutation.mutateAsync(a.id);
                    setConfirmingDeleteId(null);
                  }}
                  onCancelDelete={() => setConfirmingDeleteId(null)}
                  isConfirmingDelete={confirmingDeleteId === a.id}
                  onSetDefault={() => void setDefaultMutation.mutateAsync(a.id)}
                  isMutating={
                    deleteMutation.isPending ||
                    setDefaultMutation.isPending
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddressCard({
  address: a,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  isConfirmingDelete,
  onSetDefault,
  isMutating,
}: {
  address: BuyerAddressDto;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isConfirmingDelete: boolean;
  onSetDefault: () => void;
  isMutating: boolean;
}) {
  const { t } = useTranslation();
  const localizedGovernorate = t(`governorates.${a.governorate}`, a.governorate);
  return (
    <Card
      className={[
        'transition-colors',
        a.isDefault ? 'border-primary/40' : 'border-divider/60',
      ].join(' ')}
    >
      <Card.Content>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{a.label}</h2>
              {a.isDefault ? (
                <span className="inline-flex items-center gap-1 rounded-medium border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Star className="size-3" aria-hidden />
                  {t('addresses.defaultBadge')}
                </span>
              ) : null}
            </div>
            <p className="text-sm font-medium text-foreground">{a.recipientName}</p>
            <p className="font-mono text-xs text-muted-strong">
              {a.phone}
            </p>
            <p className="text-sm text-default-700 dark:text-default-300">
              {a.streetAddress}
              {a.apartment ? `, ${t('addresses.apartmentShort')} ${a.apartment}` : ''}
              {a.floor ? `, ${t('addresses.floorShort')} ${a.floor}` : ''}
            </p>
            <p className="text-sm text-default-700 dark:text-default-300">
              {a.city}, {localizedGovernorate}
            </p>
            {a.landmark ? (
              <p className="text-xs text-muted-strong">
                {t('addresses.landmark')}: {a.landmark}
              </p>
            ) : null}
            {a.notes ? (
              <p className="text-xs italic text-muted-strong">{a.notes}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              isIconOnly
              variant="ghost"
              size="md"
              onPress={onEdit}
              aria-label={t('addresses.actions.edit')}
              className="min-h-11 min-w-11"
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            {!a.isDefault ? (
              <Button
                isIconOnly
                variant="ghost"
                size="md"
                onPress={onSetDefault}
                isDisabled={isMutating}
                aria-label={t('addresses.actions.setDefault')}
                className="min-h-11 min-w-11"
              >
                <Star className="size-4" aria-hidden />
              </Button>
            ) : null}
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-default-500 px-1 hidden sm:inline">{t('addresses.delete.confirmPrompt')}</span>
                <Button
                  size="sm"
                  variant="primary"
                  onPress={onConfirmDelete}
                  className="min-h-11 text-danger bg-danger-50 dark:bg-danger-950/20 hover:bg-danger/20"
                >
                  {t('addresses.delete.confirm')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={onCancelDelete}
                  className="min-h-11"
                >
                  {t('addresses.delete.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                isIconOnly
                variant="ghost"
                size="md"
                onPress={onDelete}
                isDisabled={isMutating}
                aria-label={t('addresses.actions.delete')}
                className="min-h-11 min-w-11 text-default-500 hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
