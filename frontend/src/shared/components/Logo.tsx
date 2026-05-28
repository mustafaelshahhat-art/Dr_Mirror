import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export type LogoSize = 32 | 48 | 64 | 128 | 192 | 256 | 512;

export interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const variant = !mounted || resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <img
      src={`/brand/logo-${variant}-${size}.webp`}
      alt="Dr.Mirror"
      width={size}
      height={size}
      className={className}
    />
  );
}
