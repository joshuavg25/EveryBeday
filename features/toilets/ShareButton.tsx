'use client';

import { useState } from 'react';
import { CheckIcon, ShareIcon } from '@/components/icons';
import { buttonClass } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';

// Shares the toilet's page: the phone's share sheet if there is one, otherwise copies the link
export function ShareButton({
  path,
  title,
  compact = false,
}: {
  path: string;
  title: string;
  // Icon only, for tight rows. The label stays available to screen readers.
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // The user closed the share sheet, or the browser blocked clipboard access: nothing to do
    }
  }

  const label = copied ? t('toilet.linkCopied') : t('toilet.share');
  return (
    <button
      type="button"
      onClick={share}
      title={compact ? label : undefined}
      className={buttonClass('secondary', compact ? 'w-11 px-0!' : '')}
    >
      {copied && compact ? (
        <CheckIcon width={18} height={18} />
      ) : (
        <ShareIcon width={18} height={18} />
      )}
      <span aria-live="polite" className={compact ? 'sr-only' : undefined}>
        {label}
      </span>
    </button>
  );
}
