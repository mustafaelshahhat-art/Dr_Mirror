import { Tabs, Tooltip } from '@heroui/react';
import { Lock, MapPin, RotateCcw, ShoppingBag, UserRound } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

export const ACCOUNT_TAB_KEYS = ['personal-data', 'orders', 'returns', 'addresses', 'security'] as const;
export type AccountTabKey = typeof ACCOUNT_TAB_KEYS[number];

const tabs: Array<{ key: AccountTabKey; labelKey: string; icon: ReactNode }> = [
  { key: 'personal-data', labelKey: 'account.account.tabs.personalData', icon: <UserRound className="size-4" aria-hidden /> },
  { key: 'orders', labelKey: 'account.account.tabs.orders', icon: <ShoppingBag className="size-4" aria-hidden /> },
  { key: 'returns', labelKey: 'account.account.tabs.returns', icon: <RotateCcw className="size-4" aria-hidden /> },
  { key: 'addresses', labelKey: 'account.account.tabs.addresses', icon: <MapPin className="size-4" aria-hidden /> },
  { key: 'security', labelKey: 'account.account.tabs.security', icon: <Lock className="size-4" aria-hidden /> },
];

function normalizeTab(value: string | null): AccountTabKey {
  return ACCOUNT_TAB_KEYS.includes(value as AccountTabKey) ? (value as AccountTabKey) : 'personal-data';
}

export function AccountPageNav({ panels }: { panels: Record<AccountTabKey, ReactNode> }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = normalizeTab(searchParams.get('tab'));

  return (
    <Tabs
      variant="secondary"
      selectedKey={selected}
      onSelectionChange={(key) => setSearchParams({ tab: String(key) }, { replace: true })}
      className="space-y-6"
    >
      <Tabs.ListContainer className="overflow-x-auto">
        <Tabs.List aria-label={t('account.account.tabs.label')}>
          {tabs.map((tab) => {
            const label = t(tab.labelKey);
            return (
              <Tabs.Tab key={tab.key} id={tab.key}>
                <Tooltip delay={300} closeDelay={0}>
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    {tab.icon}
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
                </Tooltip>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs.ListContainer>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.key} id={tab.key} className="data-[selected=true]:enter-fade">
          {panels[tab.key]}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
