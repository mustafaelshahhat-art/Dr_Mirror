import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';

/**
 * Theme toggle — DESIGN_PRINCIPLES §7: 100ms instant flip via HeroUI Button's
 * built-in transition. Honors prefers-reduced-motion via globals.css.
 *
 * Pre-mount the icon is rendered as "dark" by default to avoid hydration
 * hiccups on the first paint; the inline script in index.html has already
 * set the correct html class before this component mounts.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme !== 'light' : true;
  const next = isDark ? 'light' : 'dark';
  const label = t('header.switchTheme');

  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      onPress={() => setTheme(next)}
      aria-label={label}
    >
      {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </Button>
  );
}
