import { ClipboardList, CreditCard, FolderTree, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/**
 * Admin landing tile-board at <c>/admin</c>. One tile per operational
 * surface — orders, products, categories, payment methods.
 */
export function AdminHubPage() {
  const { t } = useTranslation();
  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.hub.title')}</h1>
        <p className="text-sm text-default-500">{t('admin.hub.subtitle')}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          to="/admin/orders"
          icon={ClipboardList}
          title={t('admin.hub.tiles.orders.title')}
          subtitle={t('admin.hub.tiles.orders.subtitle')}
          tone="primary"
        />
        <Tile
          to="/admin/products"
          icon={Package}
          title={t('admin.hub.tiles.products.title')}
          subtitle={t('admin.hub.tiles.products.subtitle')}
          tone="secondary"
        />
        <Tile
          to="/admin/categories"
          icon={FolderTree}
          title={t('admin.hub.tiles.categories.title')}
          subtitle={t('admin.hub.tiles.categories.subtitle')}
          tone="warning"
        />
        <Tile
          to="/admin/payment-methods"
          icon={CreditCard}
          title={t('admin.hub.tiles.paymentMethods.title')}
          subtitle={t('admin.hub.tiles.paymentMethods.subtitle')}
          tone="success"
        />
      </div>
    </section>
  );
}

type Tone = 'primary' | 'secondary' | 'warning' | 'success';

function Tile({
  to,
  icon: Icon,
  title,
  subtitle,
  tone,
}: {
  to: string;
  icon: typeof Package;
  title: string;
  subtitle: string;
  tone: Tone;
}) {
  const toneClasses: Record<Tone, string> = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-large border border-divider/60 bg-content1 p-4 transition-colors hover:bg-content2"
    >
      <span className={`grid size-10 place-items-center rounded-medium ${toneClasses[tone]}`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-default-500">{subtitle}</span>
      </span>
    </Link>
  );
}
