import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl font-bold tabular-nums text-default-200 dark:text-default-700">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t('common.notFound.title')}
      </h1>
      <p className="max-w-prose text-sm text-default-500">
        {t('common.notFound.subtitle')}
      </p>
      <Link
        to="/"
        className="mt-2 rounded-medium bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('common.notFound.cta')}
      </Link>
    </div>
  );
}
