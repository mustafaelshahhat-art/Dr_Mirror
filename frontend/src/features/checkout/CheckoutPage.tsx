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
import { useAddressesQuery } from '../addresses/hooks';
import { useCart } from '../cart/useCart';
import { useCreateOrderMutation, usePaymentMethodsQuery } from '../orders/hooks';

import { AddressStep } from './components/AddressStep';
import { CheckoutSteps, type CheckoutStep } from './components/CheckoutSteps';
import { CheckoutSummary } from './components/CheckoutSummary';
import { PaymentMethodPicker } from './components/PaymentMethodPicker';
import { ReviewStep } from './components/ReviewStep';
import { checkoutSchema, type CheckoutForm } from './schemas';

import { FormField } from '../auth/components/FormField';
import type { AppLang } from '../../shared/lib/theme-storage';
import { LinkButton } from '../../shared/components/LinkButton';

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

  if (cart.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner aria-label={t('checkout.loading')} />
      </div>
    );
  }

  // Empty-cart guard — buyer reached /checkout with no cart (refreshed after
  // checkout consumed it, or arrived deep-linked). Send them back.
  if (cart.items.length === 0 && !createOrder.isPending && !createOrder.isSuccess) {
    return (
      <div className="space-y-3 rounded-large border border-divider/60 bg-content1 p-10 text-center">
        <h1 className="text-lg font-semibold">{t('checkout.empty.title')}</h1>
        <p className="text-sm text-default-500">{t('checkout.empty.subtitle')}</p>
        <LinkButton
          to="/"
        >
          {t('checkout.empty.cta')}
        </LinkButton>
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
            <AddressStep
              control={control}
              watch={watch}
              setValue={setValue}
              savedAddresses={savedAddresses}
              savedAddressId={savedAddressId}
              setSavedAddressId={setSavedAddressId}
              saveAsNewAddress={saveAsNewAddress}
              setSaveAsNewAddress={setSaveAsNewAddress}
              newAddressLabel={newAddressLabel}
              setNewAddressLabel={setNewAddressLabel}
            />
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
              ) : paymentMethodsQuery.isError ? (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-3 rounded-medium border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
                >
                  <span>{t('checkout.payment.errorLoad')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => void paymentMethodsQuery.refetch()}
                    className="shrink-0 text-danger"
                  >
                    {t('checkout.payment.retry')}
                  </Button>
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
            <ReviewStep
              reviewAddress={reviewAddress}
              selectedMethod={selectedMethod}
              buyerNote={buyerNote}
              isAr={isAr}
            />
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
              <Button
                type="button"
                variant="primary"
                isDisabled={step === 'payment' && (paymentMethodsQuery.isLoading || paymentMethodsQuery.isError)}
                onPress={() => void next()}
              >
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

        <CheckoutSummary items={cart.items} subTotal={cart.subTotal} lang={lang} />
      </Form>
    </section>
  );
}
