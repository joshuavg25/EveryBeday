import Link from 'next/link';
import { BackIcon } from '@/components/icons';

// "‹ Back to map" link at the top of the non-map pages
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-ink-soft hover:text-ink -ml-1.5 inline-flex min-h-11 items-center gap-1 text-[15px] font-medium"
    >
      <BackIcon />
      {label}
    </Link>
  );
}
