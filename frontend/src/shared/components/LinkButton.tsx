import { Link, type LinkProps } from 'react-router-dom';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type ButtonTone = 'primary' | 'outline';
type ButtonSize = 'sm' | 'md';

interface ButtonChromeProps {
  children: ReactNode;
  className?: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  fullWidth?: boolean;
}

type ButtonChromeOptions = Omit<ButtonChromeProps, 'children'>;

type LinkButtonProps = LinkProps & ButtonChromeProps;
type AnchorButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & ButtonChromeProps;

const baseClasses =
  'inline-flex items-center justify-center gap-1.5 rounded-medium text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none';

const toneClasses: Record<ButtonTone, string> = {
  primary: 'bg-primary text-primary-foreground',
  outline: 'border border-divider/60 text-foreground hover:bg-content2',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3',
  md: 'px-4 py-2',
};

function buttonClasses({ tone = 'primary', size = 'md', fullWidth, className }: ButtonChromeOptions) {
  return [baseClasses, toneClasses[tone], sizeClasses[size], fullWidth ? 'w-full' : null, className]
    .filter(Boolean)
    .join(' ');
}

export function LinkButton({ children, className, tone, size, fullWidth, ...props }: LinkButtonProps) {
  return (
    <Link {...props} className={buttonClasses({ className, tone, size, fullWidth })}>
      {children}
    </Link>
  );
}

export function AnchorButton({ children, className, tone, size, fullWidth, ...props }: AnchorButtonProps) {
  return (
    <a {...props} className={buttonClasses({ className, tone, size, fullWidth })}>
      {children}
    </a>
  );
}
