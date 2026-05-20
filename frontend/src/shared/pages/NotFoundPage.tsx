import { buttonVariants } from '@heroui/styles';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div className="enter-fade-up flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      {/* Numeric "404" glyph is the visual anchor (no Lucide icon), a deliberate
          brand-restraint choice over DESIGN.md section 15.1's optional empty-state icon.
          PRODUCT.md anti-references reject the "AI assistant" / icon-heavy 404
          aesthetic; the typographic glyph reads clinical and quiet, in line with
          the `confident, clinical, calm` brand register. tabular-nums keeps the
          three digits perfectly stacked across LTR and RTL. */}
      <p className="text-6xl font-bold tabular-nums text-default-200 dark:text-default-500">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t('common.notFound.title')}
      </h1>
      <p className="max-w-prose text-sm text-default-500">
        {t('common.notFound.subtitle')}
      </p>
      <p className="rounded-medium bg-content2 px-3 py-1.5 text-xs text-default-500">
        {t('common.notFound.path', { path: location.pathname })}
      </p>
      <Link
        to={isAdminPath ? '/admin' : '/'}
        className={`${buttonVariants({ variant: 'primary' })} mt-2`}
      >
        {t(isAdminPath ? 'common.notFound.adminCta' : 'common.notFound.cta')}
      </Link>
    </div>
  );
}
