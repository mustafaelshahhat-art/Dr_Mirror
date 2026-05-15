import { Button, Spinner } from '@heroui/react';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  INQUIRY_STATUS,
  type InquiryDto,
  type InquiryStatus,
} from '../inquiries/types';
import {
  useAdminInquiriesQuery,
  useMarkInquiryReadMutation,
} from '../inquiries/hooks';

/**
 * Admin inquiries inbox at <c>/admin/inquiries</c>.
 *   - Filter pills: All / New / Read
 *   - Each row: subject, sender, product link, message preview, status badge
 *   - "Mark as read" inline action for New inquiries
 *   - "Reply by email" mailto link with the original subject prefixed Re:
 */
export function AdminInquiriesPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const [filter, setFilter] = useState<InquiryStatus | undefined>(undefined);
  const query = useAdminInquiriesQuery(filter);

  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('inquiries.admin.title')}</h1>
        <p className="text-sm text-default-500">{t('inquiries.admin.subtitle')}</p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist">
        <FilterPill
          label={t('inquiries.admin.filterAll')}
          active={filter === undefined}
          onSelect={() => setFilter(undefined)}
        />
        <FilterPill
          label={t('inquiries.admin.filterNew')}
          active={filter === INQUIRY_STATUS.New}
          onSelect={() => setFilter(INQUIRY_STATUS.New)}
        />
        <FilterPill
          label={t('inquiries.admin.filterRead')}
          active={filter === INQUIRY_STATUS.Read}
          onSelect={() => setFilter(INQUIRY_STATUS.Read)}
        />
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Spinner aria-label={t('inquiries.admin.loading')} />
        </div>
      ) : query.data?.length ? (
        <ul className="space-y-3">
          {query.data.map((inquiry) => (
            <li key={inquiry.id}>
              <InquiryRow inquiry={inquiry} dateFmt={dateFmt} isAr={isAr ?? false} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
          {t('inquiries.admin.empty')}
        </div>
      )}
    </section>
  );
}

function FilterPill({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={
        active
          ? 'rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background'
          : 'rounded-full border border-divider px-4 py-1.5 text-xs font-medium text-default-700 transition-colors hover:bg-content2 dark:text-default-300'
      }
    >
      {label}
    </button>
  );
}

function InquiryRow({
  inquiry,
  dateFmt,
  isAr,
}: {
  inquiry: InquiryDto;
  dateFmt: Intl.DateTimeFormat;
  isAr: boolean;
}) {
  const { t } = useTranslation();
  const markRead = useMarkInquiryReadMutation();
  const isNew = inquiry.status === INQUIRY_STATUS.New;
  const productName = isAr ? inquiry.productNameAr : inquiry.productNameEn;
  const replyHref = `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.subject}`)}`;

  return (
    <article className="space-y-3 rounded-large border border-divider/60 bg-content1 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={inquiry.status} />
            <span className="text-xs text-default-500 tabular-nums">
              {t('inquiries.admin.receivedAt', {
                when: dateFmt.format(new Date(inquiry.createdAt)),
              })}
            </span>
          </div>
          <h2 className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">
            {inquiry.subject}
          </h2>
          <p className="mt-0.5 text-xs text-default-500">
            {t('inquiries.admin.from')}: <span className="font-medium text-foreground">{inquiry.fullName}</span>{' '}
            <a
              href={`mailto:${inquiry.email}`}
              className="text-primary hover:underline"
              dir="ltr"
            >
              {inquiry.email}
            </a>
            {inquiry.phone ? (
              <>
                {' · '}
                <span dir="ltr">{inquiry.phone}</span>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs text-default-500">
        {productName ? (
          <span className="rounded-full bg-content2 px-2 py-0.5">
            {t('inquiries.admin.productLabel')}: <span className="font-medium text-foreground">{productName}</span>
          </span>
        ) : (
          <span className="rounded-full bg-content2 px-2 py-0.5">
            {t('inquiries.admin.generalLabel')}
          </span>
        )}
      </div>

      <p className="whitespace-pre-line rounded-medium bg-content2 px-3 py-2 text-sm leading-relaxed text-foreground">
        {inquiry.message}
      </p>

      {inquiry.readAt ? (
        <p className="text-xs text-default-500">
          {t('inquiries.admin.readAt', {
            when: dateFmt.format(new Date(inquiry.readAt)),
            by: inquiry.readByUserName ?? '',
          })}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <a href={replyHref}>
          <Button
            variant="primary"
            size="sm"
          >
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-4" aria-hidden />
              {t('admin.inquiries.reply')}
            </span>
          </Button>
        </a>
        {isNew ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            isDisabled={markRead.isPending}
            onPress={() => markRead.mutate(inquiry.id)}
          >
            {markRead.isPending
              ? t('inquiries.admin.marking')
              : t('inquiries.admin.markRead')}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const { t } = useTranslation();
  const classes =
    status === INQUIRY_STATUS.New
      ? 'bg-warning/15 text-warning border-warning/30'
      : status === INQUIRY_STATUS.Responded
        ? 'bg-success/15 text-success border-success/30'
        : 'bg-default-200/40 text-default-600 border-default-300/40 dark:bg-default-100/10 dark:text-default-300';

  const label =
    status === INQUIRY_STATUS.New
      ? t('inquiries.admin.status.new')
      : status === INQUIRY_STATUS.Responded
        ? t('inquiries.admin.status.responded')
        : t('inquiries.admin.status.read');

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
        classes,
      ].join(' ')}
    >
      {label}
    </span>
  );
}
