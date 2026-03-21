'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(
  () => import('./map-view').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <div className="bg-muted flex h-[250px] items-center justify-center rounded-lg">Loading map...</div>,
  },
);

interface EventMapProps {
  lat: number;
  lng: number;
}

export function EventMap({ lat, lng }: EventMapProps) {
  return (
    <MapView
      lat={lat}
      lng={lng}
      zoom={15}
      marker={{ lat, lng }}
      className="h-[250px] w-full rounded-lg border"
    />
  );
}
