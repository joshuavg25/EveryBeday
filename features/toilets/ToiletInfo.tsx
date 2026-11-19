import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import {
  CheckIcon,
  ClockIcon,
  DoorIcon,
  DropletIcon,
  NoteIcon,
  PeopleIcon,
  PinIcon,
  StairsIcon,
  WheelchairIcon,
} from '@/components/icons';
import type { Locale } from '@/i18n/config';
import type { Translate } from '@/i18n/translate';
import { formatAgo, formatDistance, isStale } from './format';
import type { ToiletDetail, ToiletPin } from './types';

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-ink-soft mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

// The facts about one toilet. Used in the map's bottom sheet (short) and on the detail page (full).
// It has no hooks, so it renders on the server or in the browser.
export function ToiletInfo({
  toilet,
  t,
  locale,
  full = false,
}: {
  toilet: ToiletPin | ToiletDetail;
  t: Translate;
  locale: Locale;
  full?: boolean;
}) {
  const detail = full && 'address' in toilet ? toilet : null;
  const stale = isStale(toilet.lastConfirmedAt);

  return (
    <div>
      {(toilet.status === 'pending' || toilet.distanceM !== undefined) && (
        <p className="mb-3 flex flex-wrap items-center gap-2">
          {toilet.status === 'pending' && <Badge tone="caution">{t('toilet.unverified')}</Badge>}
          {toilet.distanceM !== undefined && (
            <Badge tone="good">
              {t('toilet.distance', { distance: formatDistance(toilet.distanceM, locale) })}
            </Badge>
          )}
        </p>
      )}

      <ul className="space-y-2 text-[15px] leading-snug">
        <Fact icon={<DropletIcon />}>{t(`toilet.bidetType.${toilet.bidetType}`)}</Fact>
        <Fact icon={<DoorIcon />}>{t(`toilet.access.${toilet.access}`)}</Fact>
        {(full || toilet.gender !== 'all') && (
          <Fact icon={<PeopleIcon />}>{t(`toilet.gender.${toilet.gender}`)}</Fact>
        )}
        {(toilet.floor || toilet.buildingName) && (
          <Fact icon={<StairsIcon />}>
            {[toilet.buildingName, toilet.floor && t('toilet.floor', { floor: toilet.floor })]
              .filter(Boolean)
              .join(', ')}
          </Fact>
        )}
        <Fact icon={<ClockIcon />}>
          {toilet.is24h
            ? t('toilet.open24h')
            : toilet.openingHours
              ? t('toilet.hours', { hours: toilet.openingHours })
              : t('toilet.hoursUnknown')}
        </Fact>
        {toilet.wheelchair && <Fact icon={<WheelchairIcon />}>{t('toilet.wheelchair')}</Fact>}
        {detail?.address && <Fact icon={<PinIcon />}>{detail.address}</Fact>}
        {detail?.note && <Fact icon={<NoteIcon />}>{detail.note}</Fact>}
        {toilet.lastConfirmedAt && (
          <Fact icon={<CheckIcon />}>
            <span className={stale ? 'text-caution' : undefined}>
              {stale
                ? t('toilet.stale')
                : t('toilet.confirmedAgo', { when: formatAgo(toilet.lastConfirmedAt, locale) })}
            </span>
          </Fact>
        )}
      </ul>

      {toilet.status === 'pending' && full && (
        <p className="text-ink-soft mt-3 text-sm">{t('toilet.unverifiedHint')}</p>
      )}
      {detail && detail.recentYes + detail.recentNo > 0 && (
        <p className="text-ink-soft mt-3 text-sm">
          {t('toilet.votes', { yes: detail.recentYes, no: detail.recentNo })}
        </p>
      )}
    </div>
  );
}
