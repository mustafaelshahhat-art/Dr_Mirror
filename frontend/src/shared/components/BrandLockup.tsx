import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export type BrandLockupSize = 'sm' | 'md' | 'lg';

export interface BrandLockupProps {
  size?: BrandLockupSize;
  iconOnly?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { src: 64, display: 36, text: 'text-lg' } as const,
  md: { src: 128, display: 48, text: 'text-2xl' } as const,
  lg: { src: 128, display: 64, text: 'text-3xl' } as const,
};

const BRAND_NAME = 'Dr.Mirror';

export function BrandLockup({ size = 'sm', iconOnly = false, className }: BrandLockupProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const variant = !mounted || resolvedTheme === 'dark' ? 'dark' : 'light';
  const { src, display, text: textClass } = SIZE_MAP[size];

  return (
    <span
      className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}
      dir="ltr"
    >
      <img
        src={`/brand/logo-${variant}-${src}.webp`}
        alt={iconOnly ? BRAND_NAME : ''}
        width={display}
        height={display}
        className="shrink-0"
      />
      {!iconOnly && (
        <span
          className={`font-semibold tracking-tight text-foreground ${textClass}`}
          dir="ltr"
        >
          {BRAND_NAME}
        </span>
      )}
    </span>
  );
}
