'use client';

import dynamic from 'next/dynamic';

export const EventsMapLoader = dynamic(
  () => import('./events-map').then((m) => m.EventsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] w-full items-center justify-center overflow-hidden rounded-2xl border bg-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);
