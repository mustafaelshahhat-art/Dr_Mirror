import { Button, Spinner } from '@heroui/react';
import { toast } from '@heroui/react/toast';
import { isAxiosError } from 'axios';
import { QrCode } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../../shared/components/PageHeader';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { queryKeys } from '../../shared/lib/query-keys';
import { adminWhatsAppApi } from './api';

export function AdminWhatsAppQrPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const redirected = useRef(false);
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
    <section className="space-y-8">
      <PageHeader title={t('admin.whatsapp.qr.title')} subtitle={t('admin.whatsapp.qr.subtitle')} />

      <div className="content-surface mx-auto max-w-md p-6 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <QrCode className="size-6" aria-hidden />
        </div>

        {qrQuery.data?.qrDataUri ? (
          <img
            src={qrQuery.data.qrDataUri}
            alt={t('admin.whatsapp.qr.imageAlt')}
            className="mx-auto size-72 rounded-large border border-divider bg-white p-3"
          />
        ) : sidecarUnavailable ? (
          <QueryErrorState
            message={t('admin.whatsapp.qr.sidecarUnavailable')}
            retryLabel={t('admin.query.retry')}
            onRetry={() => void qrQuery.refetch()}
            error={qrQuery.error}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-default-500">
            <Spinner />
            {t('admin.whatsapp.qr.waiting')}
          </div>
        )}

        <p className="mt-5 text-sm text-default-500">{t('admin.whatsapp.qr.instructions')}</p>
        <Button className="mt-5" variant="outline" onPress={() => void qrQuery.refetch()}>
          {t('admin.whatsapp.qr.refresh')}
        </Button>
      </div>
    </section>
  );
}
