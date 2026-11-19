'use client';

import Link from 'next/link';
import { CloseIcon, DirectionsIcon } from '@/components/icons';
import { buttonClass } from '@/components/ui';
import { ConfirmBidet } from '@/features/toilets/ConfirmBidet';
import { kakaoDirectionsUrl } from '@/features/toilets/format';
import { ShareButton } from '@/features/toilets/ShareButton';
import { ToiletInfo } from '@/features/toilets/ToiletInfo';
import type { ToiletPin, ToiletStatus } from '@/features/toilets/types';
import { useI18n } from '@/i18n/I18nProvider';

// Slides up from the bottom of the map when a pin is tapped
export function ToiletSheet({
  toilet,
  onClose,
  onChanged,
}: {
  toilet: ToiletPin;
  onClose: () => void;
  onChanged: (status: ToiletStatus) => void;
}) {
  const { t, locale } = useI18n();
  const detailPath = `/${locale}/toilets/${toilet.id}`;

  return (
    <section
      aria-label={toilet.name}
      className="animate-sheet-up shadow-sheet text-ink pointer-events-auto max-h-[72dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pt-4 pb-6 sm:mx-auto sm:mb-4 sm:max-w-md sm:rounded-3xl"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl leading-tight font-bold">{toilet.name}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="text-ink-soft hover:bg-mist -mt-1 -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="mt-3">
        <ToiletInfo toilet={toilet} t={t} locale={locale} />
      </div>

      <div className="mt-5 flex gap-2">
        <a
          href={kakaoDirectionsUrl(toilet)}
          target="_blank"
          rel="noreferrer"
          className={buttonClass('primary', 'flex-1')}
        >
          <DirectionsIcon width={18} height={18} />
          {t('toilet.directions')}
        </a>
        <Link href={detailPath} className={buttonClass('secondary')}>
          {t('toilet.details')}
        </Link>
        <ShareButton path={detailPath} title={toilet.name} compact />
      </div>

      <div className="border-line mt-5 border-t pt-4">
        <ConfirmBidet toiletId={toilet.id} onResult={(result) => onChanged(result.status)} />
      </div>
    </section>
  );
}
