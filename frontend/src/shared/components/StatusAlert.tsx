import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export type StatusAlertVariant = 'danger' | 'warning' | 'success' | 'info';

interface StatusAlertProps {
  variant: StatusAlertVariant;
  children: ReactNode;
  role?: string;
  className?: string;
}

export function StatusAlert({
  variant,
  children,
  role,
  className = '',
}: StatusAlertProps) {
  // Determine standard aria role based on semantic variant
  const effectiveRole = role ?? (variant === 'danger' || variant === 'warning' ? 'alert' : 'status');

  // Map variant to styling classes
  const styles = {
    danger: {
      border: 'border-danger/40 dark:border-danger/30',
      bg: 'bg-danger/10 dark:bg-danger/5',
      text: 'text-danger dark:text-danger-400',
      icon: <XCircle className="size-4.5 shrink-0 text-danger" aria-hidden />,
    },
    warning: {
      border: 'border-warning/50 dark:border-warning/30',
      bg: 'bg-warning/15 dark:bg-warning/5',
      text: 'text-warning-800 dark:text-warning font-medium',
      icon: <AlertTriangle className="size-4.5 shrink-0 text-warning" aria-hidden />,
    },
    success: {
      border: 'border-success/40 dark:border-success/30',
      bg: 'bg-success/10 dark:bg-success/5',
      text: 'text-success-800 dark:text-success font-medium',
      icon: <CheckCircle2 className="size-4.5 shrink-0 text-success" aria-hidden />,
    },
    info: {
      border: 'border-brand/40 dark:border-brand/35',
      bg: 'bg-brand/10 dark:bg-brand/5',
      text: 'text-brand dark:text-brand font-medium',
      icon: <Info className="size-4.5 shrink-0 text-brand" aria-hidden />,
    },
  }[variant];

  return (
    <div
      role={effectiveRole}
      className={[
        'enter-fade-up flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all duration-300',
        styles.border,
        styles.bg,
        styles.text,
        className,
      ].join(' ')}
    >
      {styles.icon}
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
