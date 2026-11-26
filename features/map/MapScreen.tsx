'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CustomOverlayMap, Map, MapMarker, MarkerClusterer } from 'react-kakao-maps-sdk';
import { DropletIcon, FilterIcon, LocateIcon, PlusIcon } from '@/components/icons';
import { Chip } from '@/components/ui';
import { api, errorMessage } from '@/features/api/client';
import { AccountMenu } from '@/features/auth/AccountMenu';
import type { ToiletPin } from '@/features/toilets/types';
import { useI18n } from '@/i18n/I18nProvider';
import { getPosition, PIN, SEOUL_CITY_HALL, useKakao } from './kakao';
import { ToiletSheet } from './ToiletSheet';
import {
  filterQuery,
  hasActiveFilters,
  NO_FILTERS,
  useToilets,
  type MapFilters,
} from './useToilets';

type LatLng = { lat: number; lng: number };

// The home screen: a full-screen map with filters on top, the "nearest bidet" action at the
// bottom, and a sheet that slides up when a pin is tapped.
export function MapScreen() {
  const { t, locale } = useI18n();
  const [sdkLoading, sdkError] = useKakao();
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [bbox, setBbox] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<ToiletPin | null>(null);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [finding, setFinding] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { toilets, failed, settled } = useToilets(bbox, filters, version);

  // Keep the Next.js development controls above the map's add/location controls.
  // Next.js renders these controls inside a shadow root, so the offset has to be
  // applied after the portal is mounted and whenever its menu opens.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const indicatorBottom = '144px';
    const panelBottom = '190px';
    const rightOffset = '16px';
    let shadowObserver: MutationObserver | null = null;

    const setImportantStyle = (element: HTMLElement, property: string, value: string) => {
      if (
        element.style.getPropertyValue(property) !== value ||
        element.style.getPropertyPriority(property) !== 'important'
      ) {
        element.style.setProperty(property, value, 'important');
      }
    };

    const applyPosition = (root: ShadowRoot) => {
      const indicator = root.querySelector<HTMLElement>('#devtools-indicator');
      const panel = root.querySelector<HTMLElement>('#nextjs-dev-tools-menu');

      if (indicator) {
        setImportantStyle(indicator, 'bottom', indicatorBottom);
        setImportantStyle(indicator, 'right', rightOffset);
      }
      if (panel) {
        setImportantStyle(panel, 'bottom', panelBottom);
        setImportantStyle(panel, 'right', rightOffset);
      }
    };

    const observePortal = () => {
      const portal = document.querySelector('nextjs-portal');
      const root = portal?.shadowRoot;
      if (!root) return;

      applyPosition(root);
      shadowObserver?.disconnect();
      shadowObserver = new MutationObserver(() => applyPosition(root));
      shadowObserver.observe(root, {
        attributes: true,
        attributeFilter: ['class', 'data-rendered', 'style'],
        childList: true,
        subtree: true,
      });
    };

    const portalObserver = new MutationObserver(observePortal);
    portalObserver.observe(document.body, { childList: true, subtree: true });
    observePortal();

    return () => {
      portalObserver.disconnect();
      shadowObserver?.disconnect();
    };
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const moveTo = useCallback(
    (target: LatLng, level: number) => {
      if (!map) return;
      map.setLevel(level);
      map.panTo(new kakao.maps.LatLng(target.lat, target.lng));
    },
    [map],
  );

  // Open the sheet for a toilet and slide the map so its pin stays visible above the sheet
  const select = useCallback(
    (toilet: ToiletPin, level?: number) => {
      setSelected(toilet);
      if (!map) return;
      if (level !== undefined) map.setLevel(level);
      const position = new kakao.maps.LatLng(toilet.lat, toilet.lng);
      const projection = map.getProjection();
      const point = projection.containerPointFromCoords(position);
      // Aim the pin at roughly the top quarter of the screen: the sheet covers the lower part
      const shift = map.getNode().clientHeight * 0.27;
      map.panTo(
        projection.coordsFromContainerPoint(new kakao.maps.Point(point.x, point.y + shift)),
      );
    },
    [map],
  );

  // Ask for the user's position, remember it, and optionally complain when it's unavailable
  const locate = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      const position = await getPosition();
      if (position) setMyLocation(position);
      else if (!options.quiet) showToast(t('map.locationOff'));
      return position;
    },
    [showToast, t],
  );

  // Center on the user once, as soon as the map exists. Stays on Seoul City Hall if denied.
  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    getPosition().then((position) => {
      if (cancelled || !position) return;
      setMyLocation(position);
      map.setLevel(4);
      map.panTo(new kakao.maps.LatLng(position.lat, position.lng));
    });
    return () => {
      cancelled = true;
    };
  }, [map]);

  async function showMyLocation() {
    const position = await locate();
    if (position) moveTo(position, 4);
  }

  async function findNearest() {
    setFinding(true);
    try {
      const position = await locate();
      if (!position) return;
      const query = filterQuery(filters);
      const data = await api<{ toilets: ToiletPin[] }>(
        `/api/toilets/nearest?lat=${position.lat}&lng=${position.lng}&limit=1${query ? `&${query}` : ''}`,
      );
      const nearest = data.toilets[0];
      if (!nearest) {
        showToast(t('map.nearestNone'));
        return;
      }
      select(nearest, 3);
    } catch (err) {
      showToast(errorMessage(t, err));
    } finally {
      setFinding(false);
    }
  }

  const toggle = (key: 'open24h' | 'free' | 'wheelchair' | 'verified') =>
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  const toggleGender = (gender: 'male' | 'female') =>
    setFilters((f) => ({ ...f, gender: f.gender === gender ? null : gender }));

  if (sdkError) {
    return (
      <div className="flex h-dvh items-center justify-center p-8 text-center">
        <p className="max-w-xs">{t('map.loadError')}</p>
      </div>
    );
  }

  const status = failed
    ? t('map.fetchError')
    : settled && toilets.length === 0 && !selected
      ? hasActiveFilters(filters)
        ? t('map.emptyFiltered')
        : t('map.empty')
      : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {sdkLoading ? (
        <div className="bg-foam h-full w-full animate-pulse" />
      ) : (
        <Map
          center={SEOUL_CITY_HALL}
          level={7}
          style={{ width: '100%', height: '100%' }}
          onCreate={setMap}
          onIdle={(target) => {
            const bounds = target.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            setBbox(
              [sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()]
                .map((n) => n.toFixed(4))
                .join(','),
            );
          }}
          onClick={() => setSelected(null)}
        >
          <MarkerClusterer averageCenter minLevel={8}>
            {toilets
              .filter((toilet) => toilet.id !== selected?.id)
              .map((toilet) => (
                <MapMarker
                  key={toilet.id}
                  position={{ lat: toilet.lat, lng: toilet.lng }}
                  title={toilet.name}
                  image={toilet.status === 'pending' ? PIN.unverified : PIN.verified}
                  onClick={() => select(toilet)}
                />
              ))}
          </MarkerClusterer>

          {/* The picked toilet is drawn on its own so it never disappears into a cluster */}
          {selected && (
            <MapMarker
              position={{ lat: selected.lat, lng: selected.lng }}
              title={selected.name}
              image={PIN.selected}
              zIndex={10}
            />
          )}

          {myLocation && (
            <CustomOverlayMap position={myLocation} zIndex={5}>
              <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.25)]" />
            </CustomOverlayMap>
          )}
        </Map>
      )}

      {/* Top: brand, account menu, filters. Empty areas let touches through to the map. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-2.5 pt-3">
        <div className="flex items-center justify-between px-3">
          <h1 className="shadow-float text-ink bg-surface pointer-events-auto flex h-11 items-center gap-1.5 rounded-full pr-4 pl-3 text-[17px] font-bold tracking-tight">
            <DropletIcon className="text-water" fill="currentColor" strokeWidth={0} />
            {t('common.appName')}
          </h1>
          <div className="pointer-events-auto">
            <AccountMenu />
          </div>
        </div>

        <div className="pointer-events-none flex items-start gap-2 px-3 pb-2">
          <button
            type="button"
            aria-label={t('filters.label')}
            aria-expanded={filtersOpen}
            aria-controls="map-filters"
            onClick={() => setFiltersOpen((open) => !open)}
            className={`shadow-float text-ink bg-surface hover:bg-foam pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${filtersOpen ? 'text-water' : ''}`}
          >
            <FilterIcon />
          </button>

          <div
            id="map-filters"
            role="group"
            aria-label={t('filters.label')}
            aria-hidden={!filtersOpen}
            inert={!filtersOpen}
            className={`no-scrollbar pointer-events-auto flex min-w-0 gap-2 overflow-x-auto pt-1 transition-[translate,opacity] duration-200 ease-in-out motion-reduce:transition-none ${filtersOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-3 opacity-0'}`}
          >
            <Chip shadow={false} pressed={filters.open24h} onToggle={() => toggle('open24h')}>
              {t('filters.open24h')}
            </Chip>
            <Chip shadow={false} pressed={filters.free} onToggle={() => toggle('free')}>
              {t('filters.free')}
            </Chip>
            <Chip shadow={false} pressed={filters.wheelchair} onToggle={() => toggle('wheelchair')}>
              {t('filters.wheelchair')}
            </Chip>
            <Chip
              shadow={false}
              pressed={filters.gender === 'female'}
              onToggle={() => toggleGender('female')}
            >
              {t('filters.female')}
            </Chip>
            <Chip
              shadow={false}
              pressed={filters.gender === 'male'}
              onToggle={() => toggleGender('male')}
            >
              {t('filters.male')}
            </Chip>
            <Chip shadow={false} pressed={filters.verified} onToggle={() => toggle('verified')}>
              {t('filters.verified')}
            </Chip>
          </div>
        </div>

        {(toast ?? status) && (
          <p
            role="status"
            className="shadow-float mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-2xl bg-[#0f2a2e] px-4 py-2 text-center text-sm text-white"
          >
            {toast ?? status}
          </p>
        )}
      </div>

      {/* Bottom: map actions, then the sheet for the picked toilet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3">
        <div className={`flex items-end justify-between px-3 ${selected ? '' : 'pb-8'}`}>
          {/* Spacer keeps the main action centered */}
          <span className="w-11" />
          {!selected && (
            <button
              type="button"
              onClick={findNearest}
              disabled={finding || !map}
              className="shadow-float pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-[#0b8a83] pr-6 pl-5 text-base font-semibold text-white hover:bg-[#086f69] disabled:opacity-70"
            >
              <DropletIcon fill="currentColor" strokeWidth={0} />
              {finding ? t('map.finding') : t('map.nearest')}
            </button>
          )}
          <div className="pointer-events-auto flex flex-col gap-2.5">
            {!selected && (
              <Link
                href={`/${locale}/add`}
                aria-label={t('nav.addToilet')}
                title={t('nav.addToilet')}
                className="shadow-float text-ink bg-surface flex h-11 w-11 items-center justify-center rounded-full"
              >
                <PlusIcon />
              </Link>
            )}
            <button
              type="button"
              onClick={showMyLocation}
              aria-label={t('map.locate')}
              title={t('map.locate')}
              className="shadow-float text-ink bg-surface flex h-11 w-11 items-center justify-center rounded-full"
            >
              <LocateIcon />
            </button>
          </div>
        </div>

        {selected && (
          <ToiletSheet
            key={selected.id}
            toilet={selected}
            onClose={() => setSelected(null)}
            onChanged={(status) => {
              // Refresh the pins; a toilet that was just hidden also leaves the screen
              setVersion((v) => v + 1);
              setSelected((current) => (current ? { ...current, status } : current));
            }}
          />
        )}
      </div>
    </div>
  );
}
