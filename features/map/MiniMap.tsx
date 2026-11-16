'use client';

import { Map, MapMarker } from 'react-kakao-maps-sdk';
import { PIN, useKakao } from './kakao';

// Small map that shows one pin. Used on the detail page and in the moderation queue.
export function MiniMap({
  lat,
  lng,
  unverified = false,
  className = 'h-52',
}: {
  lat: number;
  lng: number;
  unverified?: boolean;
  className?: string;
}) {
  const [loading, error] = useKakao();

  if (loading || error) {
    return <div className={`bg-foam w-full rounded-2xl ${className}`} />;
  }
  return (
    <div className={`border-line w-full overflow-hidden rounded-2xl border ${className}`}>
      <Map center={{ lat, lng }} level={3} style={{ width: '100%', height: '100%' }}>
        <MapMarker position={{ lat, lng }} image={unverified ? PIN.unverified : PIN.verified} />
      </Map>
    </div>
  );
}
