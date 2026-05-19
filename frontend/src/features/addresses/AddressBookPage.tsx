import { Button, Card } from '@heroui/react';
import { ArrowLeft, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { QueryErrorState } from '../../shared/components/QueryErrorState';
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
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('addresses.backToAccount')}
        </Link>
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('addresses.title')}</h1>
          <p className="text-sm text-default-500">{t('addresses.subtitle')}</p>
        </header>
        <QueryErrorState
          message={t('addresses.errors.unknown')}
          retryLabel={t('common.query.retry')}
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  const addresses = query.data ?? [];
  const isFirstAddress = addresses.length === 0;

  return (
    <section className="space-y-8">
      <Link
        to="/account"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('addresses.backToAccount')}
      </Link>

      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('addresses.title')}
          </h1>
          <p className="text-sm text-default-500">{t('addresses.subtitle')}</p>
        </div>
        {!creating && !isFirstAddress ? (
          <Button variant="primary" size="sm" onPress={() => setCreating(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" aria-hidden />
              {t('addresses.actions.add')}
            </span>
          </Button>
        ) : null}
      </header>

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
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <MapPin className="enter-fade-up mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="enter-fade-up text-sm text-default-500">{t('addresses.empty')}</p>
        </div>
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
                  onDelete={() => void deleteMutation.mutateAsync(a.id)}
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
  onSetDefault,
  isMutating,
}: {
  address: BuyerAddressDto;
  onEdit: () => void;
  onDelete: () => void;
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
              <h2 className="text-sm font-semibold">{a.label}</h2>
              {a.isDefault ? (
                <span className="inline-flex items-center gap-1 rounded-medium border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Star className="size-3" aria-hidden />
                  {t('addresses.defaultBadge')}
                </span>
              ) : null}
            </div>
            <p className="text-sm font-medium text-foreground">{a.recipientName}</p>
            <p className="font-mono text-xs text-default-500" dir="ltr">
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
              <p className="text-xs text-default-500">
                {t('addresses.landmark')}: {a.landmark}
              </p>
            ) : null}
            {a.notes ? (
              <p className="text-xs italic text-default-500">{a.notes}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <Button
              isIconOnly
              variant="ghost"
              size="md"
              onPress={onEdit}
              aria-label={t('addresses.actions.edit')}
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
              >
                <Star className="size-4" aria-hidden />
              </Button>
            ) : null}
            <Button
              isIconOnly
              variant="ghost"
              size="md"
              onPress={onDelete}
              isDisabled={isMutating}
              aria-label={t('addresses.actions.delete')}
              className="text-default-500 hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
