import { Button, Tooltip } from '@heroui/react';
import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface SnippetProps {
  /** The string written to the clipboard on press. */
  value: string;
  /** Visible content rendered alongside the copy button: order number,
   * Instapay handle, etc. The component sits BESIDE this, never replaces it. */
  children: ReactNode;
  /** Accessible name for the copy button. REQUIRED: callers must use an
   * existing i18n key (no default; the Phase 4 brief forbids minting copy). */
  'aria-label': string;
  /** Optional class applied to the outer wrapper. */
  className?: string;
  /** Tooltip placement; logical "start"/"end" recommended for RTL safety. */
  tooltipPlacement?: 'top' | 'bottom' | 'start' | 'end';
  /** Visible tooltip text. Pass `t('orders.paymentInstructions.copy')` etc.
   * `copiedText` is shown briefly after a successful copy; if omitted the
   * tooltip silently stays on `text`. */
  text?: string;
  copiedText?: string;
}

/**
 * In-house copy-to-clipboard control composed from HeroUI v3 primitives
 * (`Button` + `Tooltip`) and Lucide icons. HeroUI v3 ships no `Snippet`
 * primitive and the Phase 4 brief forbids new dependencies, so this wrapper
 * preserves the v2-era ergonomic API on top of v3-native parts.
 *
 * The component renders the visible `children` followed by an icon-only
 * `Button` with a tooltip. On press, `value` is written to the clipboard;
  * the icon swaps from `Copy` to `Check` for ~1500ms then reverts.
 *
 * Reduced-motion safety: the icon swap is a discrete element change, not a
 * timing-function animation, so it is already reduced-motion compliant; the
 * 1500ms revert timer fires regardless of motion preference.
 */
export function Snippet({
  value,
  children,
  'aria-label': ariaLabel,
  className,
  tooltipPlacement = 'top',
  text,
  copiedText,
}: SnippetProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function handlePress() {
    try {
      await window.navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable in some browser/permission states;
       * silent fail mirrors the legacy PaymentInstructionsCard behavior. */
    }
  }

  const tooltipText = copied && copiedText ? copiedText : (text ?? null);

  const button = (
    <Button
      type="button"
      isIconOnly
      variant="ghost"
      size="sm"
      onPress={() => void handlePress()}
      onClick={() => void handlePress()}
      aria-label={ariaLabel}
      className="text-default-500 hover:text-foreground"
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </Button>
  );

  return (
    <span className={['inline-flex items-center gap-1.5', className ?? ''].join(' ')}>
      {children}
      {tooltipText ? (
        <Tooltip>
          {button}
          <Tooltip.Content placement={tooltipPlacement}>{tooltipText}</Tooltip.Content>
        </Tooltip>
      ) : (
        button
      )}
    </span>
  );
}
