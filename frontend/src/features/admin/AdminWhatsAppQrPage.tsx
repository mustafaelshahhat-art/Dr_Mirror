/* eslint-disable i18next/no-literal-string -- Allow page routes */
import { Button, Spinner } from '@heroui/react';
import { toast } from '@heroui/react/toast';
import { isAxiosError } from 'axios';
import { ArrowLeft, CheckCircle, QrCode, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../../shared/components/PageHeader';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { queryKeys } from '../../shared/lib/query-keys';
import { adminWhatsAppApi } from './api';

export function AdminWhatsAppQrPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const redirected = useRef(false);
  const isRtl = i18n.language.startsWith('ar');

  const qrQuery = useQuery({
    queryKey: queryKeys.admin.whatsapp.qr(),
    queryFn: adminWhatsAppApi.getWhatsAppQr,
    retry: false,
    refetchInterval: (query) => query.state.data?.qrDataUri ? false : 3_000,
  });

  const statusQuery = useQuery({
    queryKey: queryKeys.admin.whatsapp.status(),
    queryFn: adminWhatsAppApi.getWhatsAppStatus,
    refetchInterval: 3_000,
  });

  useEffect(() => {
    if (redirected.current) return;

    if (statusQuery.data?.connectionState === 'connected') {
      redirected.current = true;
      toast.success(t('admin.whatsapp.qr.connectedToast'));
      navigate('/admin/whatsapp', { replace: true });
    }
  }, [navigate, statusQuery.data?.connectionState, t]);

  useEffect(() => {
    if (redirected.current) return;
    if (isAxiosError(qrQuery.error) && qrQuery.error.response?.status === 409) {
      redirected.current = true;
      navigate('/admin/whatsapp', { replace: true });
    }
  }, [navigate, qrQuery.error]);

  const sidecarUnavailable = isAxiosError(qrQuery.error) && qrQuery.error.response?.status === 503;

  return (
    <section className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onPress={() => navigate('/admin/whatsapp')}
          className="rounded-full size-9 p-0 flex items-center justify-center min-w-0"
          aria-label={t('common.back') || 'Back'}
        >
          <ArrowLeft className={`size-4 ${isRtl ? 'rotate-180' : ''}`} />
        </Button>
        <PageHeader title={t('admin.whatsapp.qr.title')} subtitle={t('admin.whatsapp.qr.subtitle')} />
      </div>

      <div className="content-surface mx-auto max-w-xl p-6 sm:p-8 text-center border border-divider/60 rounded-3xl shadow-lg relative overflow-hidden backdrop-blur-md bg-background/95">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand border border-brand/20 shadow-inner">
          <QrCode className="size-7" aria-hidden />
        </div>

        {/* Centered QR Frame */}
        <div className="flex flex-col items-center justify-center">
          {qrQuery.data?.qrDataUri ? (
            <div className="relative group p-4 bg-white dark:bg-white rounded-2xl border border-divider/60 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg max-w-[280px] w-full">
              <img
                src={qrQuery.data.qrDataUri}
                alt={t('admin.whatsapp.qr.imageAlt')}
                className="w-full h-auto aspect-square rounded-xl"
              />
              <div className="absolute inset-0 rounded-2xl border-2 border-brand/0 group-hover:border-brand/40 transition-colors pointer-events-none" />
            </div>
          ) : sidecarUnavailable ? (
            <div className="w-full max-w-[340px]">
              <QueryErrorState
                message={t('admin.whatsapp.qr.sidecarUnavailable')}
                retryLabel={t('admin.query.retry')}
                onRetry={() => void qrQuery.refetch()}
                error={qrQuery.error}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 border border-divider/30 bg-default-50/50 dark:bg-default-100/5 rounded-2xl max-w-[280px] w-full aspect-square">
              <Spinner size="md" />
              <p className="text-xs text-default-400 font-semibold px-4">{t('admin.whatsapp.qr.waiting')}</p>
            </div>
          )}
        </div>

        {/* Step-by-Step Checklist Timeline */}
        <div className="mt-8 space-y-4 text-start bg-default-50/50 dark:bg-default-100/5 p-5 rounded-2xl border border-divider/30">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="size-4 text-brand" />
            {t('admin.whatsapp.qr.instructions')}
          </h4>
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold border border-brand/20">1</span>
              <p className="text-sm text-default-600 font-medium leading-relaxed">{t('admin.whatsapp.qr.step1')}</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold border border-brand/20">2</span>
              <p className="text-sm text-default-600 font-medium leading-relaxed">{t('admin.whatsapp.qr.step2')}</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold border border-brand/20">3</span>
              <p className="text-sm text-default-600 font-medium leading-relaxed">{t('admin.whatsapp.qr.step3')}</p>
            </div>
          </div>
        </div>

        {/* Refresh and Return actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            onPress={() => void qrQuery.refetch()}
            isDisabled={qrQuery.isFetching}
            className="w-full sm:w-auto font-semibold px-6"
          >
            <RefreshCw className={qrQuery.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            {t('admin.whatsapp.qr.refresh')}
          </Button>
          <Button
            variant="secondary"
            onPress={() => navigate('/admin/whatsapp')}
            className="w-full sm:w-auto font-semibold px-6"
          >
            {t('admin.whatsapp.disconnect.cancel')}
          </Button>
        </div>
      </div>
    </section>
  );
}
