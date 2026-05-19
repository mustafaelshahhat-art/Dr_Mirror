export type BrandMarkSize = 16 | 20 | 24 | 32 | 40;

export interface BrandMarkProps {
  size?: BrandMarkSize;
  title?: string;
  className?: string;
}

export function BrandMark({ size = 24, title, className }: BrandMarkProps) {
  const hasTitle = Boolean(title);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden={hasTitle ? undefined : 'true'}
      role={hasTitle ? 'img' : undefined}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {hasTitle && <title>{title}</title>}
      {/* Rounded-square housing */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        ry="5"
        fill="var(--brand)"
        fillOpacity="0.12"
      />
      {/* Stroked cross — horizontal arm */}
      <line
        x1="7"
        y1="12"
        x2="17"
        y2="12"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Stroked cross — vertical arm */}
      <line
        x1="12"
        y1="7"
        x2="12"
        y2="17"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 2-px accent dot — upper-end side */}
      <circle cx="17" cy="7" r="2" fill="var(--brand)" />
    </svg>
  );
}
