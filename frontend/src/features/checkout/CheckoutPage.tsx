import { Button, Form, Spinner } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import type { ProblemDetails } from '../auth/types';
import { useAuth } from '../auth/useAuth';
import { FormField } from '../auth/components/FormField';
import { GovernorateSelect } from '../addresses/components/GovernorateSelect';
import { useAddressesQuery } from '../addresses/hooks';
import { useCart } from '../cart/useCart';
import { useCreateOrderMutation, usePaymentMethodsQuery } from '../orders/hooks';

import { CheckoutSteps, type CheckoutStep } from './components/CheckoutSteps';
import { PaymentMethodPicker } from './components/PaymentMethodPicker';
import { checkoutSchema, type CheckoutForm } from './schemas';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';

/**
 * Multi-step checkout. Behind <c>ProtectedRoute</c> — anonymous users land
 * on the cart page's "proceed" button and get bounced to /login first.
 *
 *   1. Address — buyer fills shipping details, validated client-side via zod.
 *   2. Payment — pick an active payment method (COD lands order Confirmed;
 *      Instapay / Wallet land it Pending until proof upload).
 *   3. Review — read-only summary; submit creates the order and redirects to
 *      the order detail page.
 */
export function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const { user, isBootstrapping } = useAuth();
  const { cart } = useCart();
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const createOrder = useCreateOrderMutation();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>('address');
  const [serverError, setServerError] = useState<string | null>(null);
  // Saved-address mode: when set, the inline form is hidden and we send
  // BuyerAddressId at submit time. null means inline form (which can
  // optionally be saved as a new address via the checkbox below).
  const [savedAddressId, setSavedAddressId] = useState<string | null>(null);
  const [saveAsNewAddress, setSaveAsNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const addressesQuery = useAddressesQuery();

  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      address: {
        recipientName: user?.fullName ?? '',
        phone: '',
        governorate: '',
        city: '',
        streetAddress: '',
        floor: '',
        apartment: '',
        landmark: '',
        notes: '',
      },
      paymentMethodId: '',
      buyerNote: '',
    },
  });

  // Once the buyer's profile arrives, pre-fill the recipient name if it's empty.
  useEffect(() => {
    if (user?.fullName) {
      setValue('address.recipientName', user.fullName, { shouldDirty: false });
    }
  }, [user, setValue]);

  // Auth gating: while bootstrapping, show spinner; once we know they're not
  // signed in, bounce to /login. (ProtectedRoute also covers this but the
  // checkout link reaches us from the cart page which is public.)
  if (isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner aria-label={t('checkout.loading')} />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: { pathname: '/checkout' } }} replace />;
  }

  // Empty-cart guard — buyer reached /checkout with no cart (refreshed after
  // checkout consumed it, or arrived deep-linked). Send them back.
  if (cart.items.length === 0 && !createOrder.isPending && !createOrder.isSuccess) {
    return (
      <div className="space-y-3 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">{t('checkout.empty.title')}</h1>
        <p className="text-sm text-default-500">{t('checkout.empty.subtitle')}</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-medium bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {t('checkout.empty.cta')}
        </Link>
      </div>
    );
  }

  const paymentMethodId = watch('paymentMethodId');
  const buyerNote = watch('buyerNote');
  const address = watch('address');
  const selectedMethod = paymentMethodsQuery.data?.find((m) => m.id === paymentMethodId);

  // When a saved address is selected the inline form is hidden, so `address`
  // (watch result) holds empty defaults. Resolve the actual saved address for
  // the review step so it shows real data instead of blank fields.
  const savedAddresses = addressesQuery.data ?? [];
  const selectedSavedAddress = savedAddressId
    ? (savedAddresses.find((a) => a.id === savedAddressId) ?? null)
    : null;
  const reviewAddress = selectedSavedAddress ?? address;

  async function next() {
    if (step === 'address') {
      // If the buyer picked a saved address, skip inline form validation.
      if (savedAddressId !== null) {
        setStep('payment');
        return;
      }
      const ok = await trigger('address');
      if (!ok) return;
      // If they want to save the inline address, we additionally need a label.
      if (saveAsNewAddress && newAddressLabel.trim().length === 0) {
        setServerError(t('checkout.errors.labelRequired'));
        return;
      }
      setStep('payment');
      return;
    }
    if (step === 'payment') {
      const ok = await trigger('paymentMethodId');
      if (ok) setStep('review');
      return;
    }
  }
  function previous() {
    setServerError(null);
    if (step === 'review') setStep('payment');
    else if (step === 'payment') setStep('address');
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const usingSaved = savedAddressId !== null;
      const order = await createOrder.mutateAsync({
        paymentMethodId: values.paymentMethodId,
        buyerAddressId: usingSaved ? savedAddressId : null,
        shippingAddress: usingSaved
          ? null
          : {
              recipientName: values.address.recipientName,
              phone: values.address.phone,
              governorate: values.address.governorate,
              city: values.address.city,
              streetAddress: values.address.streetAddress,
              floor: values.address.floor || null,
              apartment: values.address.apartment || null,
              landmark: values.address.landmark || null,
              notes: values.address.notes || null,
            },
        saveAsNewAddress: !usingSaved && saveAsNewAddress,
        label: !usingSaved && saveAsNewAddress ? newAddressLabel.trim() : null,
        buyerNote: values.buyerNote?.trim() ? values.buyerNote.trim() : null,
      });
      navigate(`/account/orders/${encodeURIComponent(order.orderNumber)}`);
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setServerError(problem?.detail ?? problem?.title ?? t('checkout.errors.unknown'));
    }
  });

  return (
    <section className="space-y-6">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('checkout.backToCart')}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('checkout.title')}</h1>
        <p className="text-sm text-default-500">{t('checkout.subtitle')}</p>
      </header>

      <CheckoutSteps current={step} />

      <Form
        onSubmit={onSubmit}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-4">
          {serverError ? (
            <div
              role="alert"
              className="rounded-medium border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {serverError}
            </div>
          ) : null}

          {step === 'address' ? (
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
                {t('checkout.address.heading')}
              </legend>

              {(addressesQuery.data ?? []).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-default-500">
                    {t('checkout.address.savedHeading')}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(addressesQuery.data ?? []).map((a) => {
                      const localizedGov = t(`governorates.${a.governorate}`, a.governorate);
                      const isSelected = savedAddressId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSavedAddressId(a.id)}
                          className={[
                            'rounded-medium border p-3 text-start transition-colors',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-divider bg-content1 hover:bg-content2',
                          ].join(' ')}
                        >
                          <p className="text-sm font-semibold">
                            {a.label}
                            {a.isDefault ? (
                              <span className="ms-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0 text-xs font-medium text-primary">
                                {t('addresses.defaultBadge')}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-default-500" dir="ltr">
                            {a.phone}
                          </p>
                          <p className="text-xs text-default-700 dark:text-default-300">
                            {a.streetAddress}
                          </p>
                          <p className="text-xs text-default-700 dark:text-default-300">
                            {a.city}, {localizedGov}
                          </p>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={savedAddressId === null}
                      onClick={() => setSavedAddressId(null)}
                      className={[
                        'rounded-medium border p-3 text-start text-sm transition-colors',
                        savedAddressId === null
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-divider bg-content1 hover:bg-content2',
                      ].join(' ')}
                    >
                      <p className="font-semibold">{t('checkout.address.useNew.title')}</p>
                      <p className="text-xs text-default-500">
                        {t('checkout.address.useNew.subtitle')}
                      </p>
                    </button>
                  </div>
                </div>
              ) : null}

              {savedAddressId === null ? (
                <>
                  <FormField
                    name="address.recipientName"
                    control={control}
                    label={t('checkout.address.recipientName')}
                    autoComplete="name"
                    isRequired
                  />
                  <FormField
                    name="address.phone"
                    control={control}
                    label={t('checkout.address.phone')}
                    type="tel"
                    autoComplete="tel"
                    isRequired
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="text-sm font-medium">
                        {t('checkout.address.governorate')}
                      </span>
                      <GovernorateSelect
                        value={watch('address.governorate')}
                        onChange={(slug) =>
                          setValue('address.governorate', slug, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        required
                      />
                    </label>
                    <FormField
                      name="address.city"
                      control={control}
                      label={t('checkout.address.city')}
                      autoComplete="address-level2"
                      isRequired
                    />
                  </div>
                  <FormField
                    name="address.streetAddress"
                    control={control}
                    label={t('checkout.address.streetAddress')}
                    autoComplete="street-address"
                    isRequired
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      name="address.floor"
                      control={control}
                      label={t('checkout.address.floor')}
                    />
                    <FormField
                      name="address.apartment"
                      control={control}
                      label={t('checkout.address.apartment')}
                    />
                    <FormField
                      name="address.landmark"
                      control={control}
                      label={t('checkout.address.landmark')}
                    />
                  </div>
                  <FormField
                    name="address.notes"
                    control={control}
                    label={t('checkout.address.notes')}
                    description={t('checkout.address.notesHint')}
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveAsNewAddress}
                      onChange={(e) => setSaveAsNewAddress(e.target.checked)}
                      className="h-4 w-4 rounded border-divider"
                    />
                    <span>{t('checkout.address.saveAsNew')}</span>
                  </label>
                  {saveAsNewAddress ? (
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="text-xs uppercase tracking-wide text-default-500">
                        {t('checkout.address.newLabel')}
                      </span>
                      <input
                        value={newAddressLabel}
                        onChange={(e) => setNewAddressLabel(e.target.value)}
                        maxLength={64}
                        placeholder={t('checkout.address.newLabelPlaceholder')}
                        className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
                      />
                    </label>
                  ) : null}
                </>
              ) : null}
            </fieldset>
          ) : null}

          {step === 'payment' ? (
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
                {t('checkout.payment.heading')}
              </legend>
              {paymentMethodsQuery.isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Spinner aria-label={t('checkout.payment.loading')} />
                </div>
              ) : (
                <PaymentMethodPicker
                  methods={paymentMethodsQuery.data ?? []}
                  selectedId={paymentMethodId || null}
                  onSelect={(id) =>
                    setValue('paymentMethodId', id, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
              )}
              <FormField
                name="buyerNote"
                control={control}
                label={t('checkout.buyerNote.label')}
                description={t('checkout.buyerNote.hint')}
              />
            </fieldset>
          ) : null}

          {step === 'review' ? (
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
                {t('checkout.review.heading')}
              </legend>
              <article className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm">
                <h3 className="font-semibold">{t('checkout.review.shippingTo')}</h3>
                <p className="mt-1 leading-relaxed">
                  {reviewAddress?.recipientName}
                  <br />
                  <span dir="ltr">{reviewAddress?.phone}</span>
                  <br />
                  {reviewAddress?.streetAddress}
                  {reviewAddress?.apartment
                    ? `, ${t('checkout.address.apartmentShort')} ${reviewAddress.apartment}`
                    : ''}
                  {reviewAddress?.floor
                    ? `, ${t('checkout.address.floorShort')} ${reviewAddress.floor}`
                    : ''}
                  <br />
                  {reviewAddress?.city},{' '}
                  {t(
                    `governorates.${reviewAddress?.governorate}`,
                    reviewAddress?.governorate ?? '',
                  )}
                </p>
              </article>
              <article className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm">
                <h3 className="font-semibold">{t('checkout.review.payingWith')}</h3>
                <p className="mt-1">
                  {selectedMethod
                    ? isAr
                      ? selectedMethod.nameAr
                      : selectedMethod.nameEn
                    : t('checkout.review.noMethod')}
                </p>
              </article>
              {buyerNote?.trim() ? (
                <article className="rounded-medium border border-divider/60 bg-content1 p-3 text-sm italic text-default-700 dark:text-default-300">
                  &ldquo;{buyerNote}&rdquo;
                </article>
              ) : null}
            </fieldset>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              isDisabled={step === 'address' || isSubmitting}
              onPress={previous}
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
                {t('checkout.back')}
              </span>
            </Button>

            {step !== 'review' ? (
              <Button type="button" variant="primary" onPress={() => void next()}>
                <span className="inline-flex items-center gap-1.5">
                  {t('checkout.continue')}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                </span>
              </Button>
            ) : (
              <Button type="submit" variant="primary" isDisabled={isSubmitting}>
                {isSubmitting ? t('checkout.placing') : t('checkout.placeOrder')}
              </Button>
            )}
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-large border border-divider/60 bg-content1 p-4 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
            {t('checkout.summary.heading')}
          </h2>
          <ul className="space-y-2 text-sm">
            {cart.items.map((line) => {
              const name = isAr ? line.nameAr : line.nameEn;
              return (
                <li key={line.id} className="flex justify-between gap-3">
                  <span className="line-clamp-2 min-w-0 flex-1">
                    {name}{' '}
                    <span className="text-xs text-default-500">
                      × {line.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatCurrency(line.lineTotal, lang)}
                  </span>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-1 border-t border-divider/60 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-default-500">{t('checkout.summary.subTotal')}</dt>
              <dd className="tabular-nums">{formatCurrency(cart.subTotal, lang)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-default-500">{t('checkout.summary.shipping')}</dt>
              <dd className="tabular-nums">{t('checkout.summary.shippingFreeM3')}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-divider/60 pt-2 text-base font-semibold">
              <dt>{t('checkout.summary.total')}</dt>
              <dd className="tabular-nums">{formatCurrency(cart.subTotal, lang)}</dd>
            </div>
          </dl>
        </aside>
      </Form>
    </section>
  );
}
