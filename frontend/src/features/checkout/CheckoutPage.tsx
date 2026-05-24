import { Alert, Button, Form } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { useAddressesQuery } from '../addresses/hooks';
import { useCart } from '../cart/useCart';
import { useCreateOrderMutation, usePaymentMethodsQuery } from '../orders/hooks';

import { AddressStep } from './components/AddressStep';
import { CheckoutAuthGate } from './components/CheckoutAuthGate';
import { CheckoutEmptyState } from './components/CheckoutEmptyState';
import { CheckoutSteps, type CheckoutStep } from './components/CheckoutSteps';
import { fireAddressSaveOutcomeToast } from './components/CheckoutSuccessNotice';
import { CheckoutSummary } from './components/CheckoutSummary';
import { PaymentMethodSection } from './components/PaymentMethodSection';
import { ReviewStep } from './components/ReviewStep';
import { checkoutSchema, type CheckoutForm } from './schemas';

import { FormField } from '../auth/components/FormField';
import { PageHeader } from '../../shared/components/PageHeader';
import type { AppLang } from '../../shared/lib/theme-storage';
import {
  CartLineSkeleton,
  CheckoutSummarySkeleton,
  Skeleton,
} from '../../shared/components/Skeleton';
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
  return (
    <CheckoutAuthGate>
      <CheckoutBody />
    </CheckoutAuthGate>
  );
}

function CheckoutBody() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const { cart } = useCart();
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const createOrder = useCreateOrderMutation();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>('address');
  const [formError, setFormError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [paymentAvailable, setPaymentAvailable] = useState(false);
  // Saved-address mode: when set, the inline form is hidden and we send
  // BuyerAddressId at submit time. null means inline form (which can
  // optionally be saved as a new address via the checkbox below).
  const [savedAddressId, setSavedAddressId] = useState<string | null>(null);
  const [saveAsNewAddress, setSaveAsNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const addressesQuery = useAddressesQuery();
  const [hasInitializedAddress, setHasInitializedAddress] = useState(false);

  // Auto-select default address or first saved address on initial load
  useEffect(() => {
    if (addressesQuery.data && !hasInitializedAddress) {
      const defaultAddress = addressesQuery.data.find((a) => a.isDefault);
      if (defaultAddress) {
        setSavedAddressId(defaultAddress.id);
      } else if (addressesQuery.data.length > 0) {
        setSavedAddressId(addressesQuery.data[0].id);
      }
      setHasInitializedAddress(true);
    }
  }, [addressesQuery.data, hasInitializedAddress]);

  const {
    control,
    getValues,
    trigger,
    setValue,
    watch,
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

  if (cart.isLoading) {
    return (
      <section
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
        aria-busy="true"
        aria-label={t('checkout.loading')}
      >
        <div className="space-y-4 rounded-2xl">
          <Skeleton className="h-7 w-1/3 rounded-xl" />
          <Skeleton className="h-4 w-2/3 rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <CartLineSkeleton key={i} />
          ))}
        </div>
        <CheckoutSummarySkeleton />
      </section>
    );
  }

  // Empty-cart guard — buyer reached /checkout with no cart (refreshed after
  // checkout consumed it, or arrived deep-linked). Send them back.
  if (cart.items.length === 0 && !createOrder.isPending && !createOrder.isSuccess) {
    return <CheckoutEmptyState />;
  }

  // react-hook-form's watch() is a stable function; the React Compiler hint
  // is a known false positive for this library API.
  // eslint-disable-next-line react-hooks/incompatible-library
  const paymentMethodId = watch('paymentMethodId');
  const buyerNote = watch('buyerNote');
  const address = watch('address');

  // When a saved address is selected the inline form is hidden, so `address`
  // (watch result) holds empty defaults. Resolve the actual saved address for
  // the review step so it shows real data instead of blank fields.
  const savedAddresses = addressesQuery.data ?? [];
  const selectedSavedAddress = savedAddressId
    ? (savedAddresses.find((a) => a.id === savedAddressId) ?? null)
    : null;
  const reviewAddress = selectedSavedAddress ?? address;
  const selectedMethod = paymentMethodsQuery.data?.find((m) => m.id === paymentMethodId);

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
        setFormError(t('checkout.errors.labelRequired'));
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
    setFormError(null);
    if (step === 'review') setStep('payment');
    else if (step === 'payment') setStep('address');
  }

  async function handlePlaceOrder() {
    if (createOrder.isPending) return;

    setFormError(null);

    const usingSaved = savedAddressId !== null;

    // Validate only the relevant fields for the active address mode.
    if (!usingSaved) {
      const addressOk = await trigger('address');
      if (!addressOk) {
        setFormError(t('checkout.errors.unknown'));
        return;
      }
      if (saveAsNewAddress && newAddressLabel.trim().length === 0) {
        setFormError(t('checkout.errors.labelRequired'));
        return;
      }
    }

    const paymentOk = await trigger('paymentMethodId');
    if (!paymentOk) {
      setFormError(t('checkout.errors.unknown'));
      return;
    }

    try {
      const values = getValues();
      const order = await createOrder.mutateAsync({
        idempotencyKey,
        input: {
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
        },
      });
      // Surface the address-book-full notice before navigating; the toast
      // portal lives at the app root so it survives the route change.
      fireAddressSaveOutcomeToast(order.addressSaveOutcome, t);
      navigate(`/account/orders/${encodeURIComponent(order.orderNumber)}`);
    } catch {
      // Toast emitted by mutation onError.
    }
  }

  return (
    <section className="space-y-8">
      <Link to="/cart" className="back-link">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('checkout.backToCart')}
      </Link>

      <PageHeader title={t('checkout.title')} subtitle={t('checkout.subtitle')} />

      <div className="rounded-2xl border border-separator/40 bg-surface p-4 sm:p-5">
        <CheckoutSteps current={step} />
      </div>

      <Form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-4">
          {formError ? (
            <Alert status="danger" role="alert" className="rounded-xl">
              <Alert.Content>
                <Alert.Description>{formError}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div key={step} className="checkout-card enter-fade-up">
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
                <PaymentMethodSection
                  selectedId={paymentMethodId || null}
                  onSelect={(id) =>
                    // eslint-disable-next-line i18next/no-literal-string
                    setValue('paymentMethodId', id, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  onAvailabilityChange={setPaymentAvailable}
                />
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
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl pt-2">
            <Button
              type="button"
              variant="ghost"
              isDisabled={step === 'address' || createOrder.isPending}
              onPress={previous}
              className="rounded-xl"
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
                isDisabled={step === 'payment' && !paymentAvailable}
                onPress={() => void next()}
                className="rounded-xl"
              >
                <span className="inline-flex items-center gap-1.5">
                  {t('checkout.continue')}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                isPending={createOrder.isPending}
                isDisabled={createOrder.isPending}
                onPress={() => void handlePlaceOrder()}
                className="rounded-xl"
              >
                {createOrder.isPending ? t('checkout.confirming') : t('checkout.confirmOrder')}
              </Button>
            )}
          </div>
        </div>

        <CheckoutSummary items={cart.items} subTotal={cart.subTotal} lang={lang} />
      </Form>
    </section>
  );
}
