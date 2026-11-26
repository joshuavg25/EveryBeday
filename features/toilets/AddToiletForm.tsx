'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button, buttonClass, Notice } from '@/components/ui';
import { api, ApiClientError, errorMessage } from '@/features/api/client';
import { loginHref } from '@/features/auth/login';
import { MiniMap } from '@/features/map/MiniMap';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDistance, toiletName } from './format';
import { LocationPicker, type PickedLocation } from './LocationPicker';
import { ACCESS_TYPES, BIDET_TYPES, createToiletSchema, GENDER_TYPES } from './schemas';
import type { AccessType, BidetType, GenderType, ToiletStatus } from './types';

type Duplicate = { id: string; name: string; nameKo: string | null; distanceM: number };
type Created = { id: string; status: ToiletStatus };

const inputClass =
  'border-line mt-1.5 block min-h-11 w-full rounded-xl border bg-surface px-3 text-[15px] font-normal';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

// A row of options where exactly one is picked, e.g. the bidet type
function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  label,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: (value: T) => string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 ${
              value === option
                ? 'border-ink bg-ink text-white'
                : 'border-line text-ink hover:bg-mist bg-surface'
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {label(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-water h-5 w-5"
      />
      {children}
    </label>
  );
}

// Adding a toilet takes two steps: pick the spot on the map, then describe it
export function AddToiletForm() {
  const { t, locale } = useI18n();
  const { status: sessionStatus } = useSession();

  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [picking, setPicking] = useState(true);

  const [name, setName] = useState('');
  const [nameKo, setNameKo] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [address, setAddress] = useState('');
  const [floor, setFloor] = useState('');
  const [bidetType, setBidetType] = useState<BidetType>('electronic_seat');
  const [access, setAccess] = useState<AccessType>('public');
  const [gender, setGender] = useState<GenderType>('all');
  const [is24h, setIs24h] = useState(false);
  const [openingHours, setOpeningHours] = useState('');
  const [wheelchair, setWheelchair] = useState(false);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  if (sessionStatus === 'loading') {
    return <div className="bg-foam h-64 animate-pulse rounded-2xl" />;
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="bg-surface rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t('add.signInTitle')}</h2>
        <p className="text-ink-soft mt-1.5">{t('add.signInBody')}</p>
        <Link href={loginHref(locale, `/${locale}/add`)} className={buttonClass('primary', 'mt-5')}>
          {t('common.signIn')}
        </Link>
      </div>
    );
  }

  if (created) {
    return (
      <div className="bg-surface rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t('add.doneTitle')}</h2>
        <p className="text-ink-soft mt-1.5">
          {created.status === 'active' ? t('add.doneActive') : t('add.doneUnverified')}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/${locale}/toilets/${created.id}`} className={buttonClass('primary')}>
            {t('add.viewToilet')}
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              // Keep nothing from the previous toilet except the general area
              setCreated(null);
              setName('');
              setNameKo('');
              setFloor('');
              setNote('');
              setDuplicates(null);
              setPicking(true);
            }}
          >
            {t('add.addAnother')}
          </Button>
        </div>
      </div>
    );
  }

  if (picking || !location) {
    return (
      <LocationPicker
        initial={location}
        onPick={(picked) => {
          const moved = picked.lat !== location?.lat || picked.lng !== location?.lng;
          setLocation(picked);
          // A new spot means a new address: replace what the previous spot filled in
          if (moved) {
            setAddress(picked.address ?? '');
            setBuildingName(picked.buildingName ?? '');
          }
          setDuplicates(null);
          setError(null);
          setPicking(false);
        }}
      />
    );
  }

  async function submit(confirmNotDuplicate: boolean) {
    if (!location) return;
    const parsed = createToiletSchema.safeParse({
      name,
      nameKo,
      lat: location.lat,
      lng: location.lng,
      address,
      buildingName,
      floor,
      access,
      gender,
      bidetType,
      is24h,
      openingHours,
      wheelchair,
      note,
      confirmNotDuplicate,
    });
    if (!parsed.success) {
      const badName = parsed.error.issues.some((issue) => issue.path[0] === 'name');
      setError(badName ? t('add.nameRequired') : t('errors.invalid_input'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await api<{ toilet: Created }>('/api/toilets', {
        method: 'POST',
        body: parsed.data,
      });
      setCreated(data.toilet);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'possible_duplicate') {
        setDuplicates(err.details as Duplicate[]);
      } else {
        setError(errorMessage(t, err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div>
        <MiniMap lat={location.lat} lng={location.lng} className="h-36" />
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="text-water-deep mt-1 min-h-11 text-[15px] font-semibold underline-offset-4 hover:underline"
        >
          {t('add.changeSpot')}
        </button>
      </div>

      <Field label={t('add.name')}>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={100}
          required
          lang="en"
          placeholder={t('add.namePlaceholder')}
          className={inputClass}
        />
      </Field>

      <Field label={t('add.nameKo')}>
        <input
          value={nameKo}
          onChange={(e) => setNameKo(e.target.value)}
          maxLength={100}
          lang="ko"
          placeholder={t('add.nameKoPlaceholder')}
          className={inputClass}
        />
      </Field>

      <Choice
        legend={t('add.bidetType')}
        options={BIDET_TYPES}
        value={bidetType}
        onChange={setBidetType}
        label={(v) => t(`toilet.bidetType.${v}`)}
      />
      <Choice
        legend={t('add.access')}
        options={ACCESS_TYPES}
        value={access}
        onChange={setAccess}
        label={(v) => t(`toilet.access.${v}`)}
      />
      <Choice
        legend={t('add.gender')}
        options={GENDER_TYPES}
        value={gender}
        onChange={setGender}
        label={(v) => t(`toilet.gender.${v}`)}
      />

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label={t('add.building')}>
          <input
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            maxLength={100}
            className={inputClass}
          />
        </Field>
        <Field label={t('add.floor')}>
          <input
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            maxLength={10}
            placeholder={t('add.floorPlaceholder')}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t('add.address')}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={200}
          className={inputClass}
        />
      </Field>

      <div>
        <Toggle checked={is24h} onChange={setIs24h}>
          {t('add.open24h')}
        </Toggle>
        {!is24h && (
          <div className="mt-1 mb-2">
            <Field label={t('add.hours')}>
              <input
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                maxLength={100}
                placeholder={t('add.hoursPlaceholder')}
                className={inputClass}
              />
            </Field>
          </div>
        )}
        <Toggle checked={wheelchair} onChange={setWheelchair}>
          {t('add.wheelchair')}
        </Toggle>
      </div>

      <Field label={t('add.note')}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder={t('add.notePlaceholder')}
          className={`${inputClass} py-2.5`}
        />
      </Field>

      {error && <Notice tone="error">{error}</Notice>}

      {duplicates ? (
        <div role="alert" className="bg-caution-soft space-y-3 rounded-2xl p-4">
          <div>
            <h2 className="font-semibold">{t('add.duplicateTitle')}</h2>
            <p className="text-sm">{t('add.duplicateBody')}</p>
          </div>
          <ul className="space-y-1.5">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/${locale}/toilets/${d.id}`}
                  className="bg-surface flex min-h-11 items-center justify-between gap-3 rounded-xl px-3.5 text-[15px] font-medium"
                >
                  <span className="truncate">{toiletName(d, locale)}</span>
                  <span className="text-ink-soft shrink-0 text-sm font-normal">
                    {t('add.duplicateDistance', {
                      distance: formatDistance(d.distanceM, locale),
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Button variant="secondary" disabled={submitting} onClick={() => submit(true)}>
            {t('add.duplicateContinue')}
          </Button>
        </div>
      ) : (
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t('add.submitting') : t('add.submit')}
        </Button>
      )}
    </form>
  );
}
