import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Small shared building blocks so buttons, chips and notices look the same everywhere.

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants = {
  primary: 'bg-water text-white hover:bg-water-deep',
  secondary: 'border border-line bg-surface text-ink hover:bg-mist',
  quiet: 'text-ink-soft hover:bg-mist hover:text-ink',
  danger: 'border border-danger/30 bg-surface text-danger hover:bg-danger-soft',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

// Use for <a> and <Link> that should look like a button
export const buttonClass = (variant: ButtonVariant = 'primary', extra = '') =>
  `${buttonBase} ${buttonVariants[variant]} ${extra}`;

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

// On/off pill used for the map filters
export function Chip({
  pressed,
  onToggle,
  shadow = true,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  shadow?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`${shadow ? 'shadow-float' : ''} min-h-9 shrink-0 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
        pressed ? 'bg-[#0b8a83] text-white' : 'text-ink hover:bg-foam bg-surface'
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'caution' | 'good';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-mist text-ink-soft',
    caution: 'bg-caution-soft text-caution',
    good: 'bg-foam text-water-deep',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// Inline message under a form or action. role="status" so screen readers announce it.
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
}) {
  const tones = {
    info: 'bg-mist text-ink',
    error: 'bg-danger-soft text-danger',
    success: 'bg-foam text-water-deep',
  };
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-3.5 py-2.5 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

// Shared layout for the non-map pages: a readable column with room to breathe
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-xl px-5 pt-5 pb-16">{children}</div>;
}
