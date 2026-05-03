'use client';

import { useEffect, useState } from 'react';

type Props = {
  locale: string;
  startsAt: string;
};

function format(locale: string, startsAt: string, nowMs: number): string {
  const date = new Date(startsAt);
  const oneDay = 24 * 60 * 60 * 1000;
  const diffMs = date.getTime() - nowMs;

  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  if (diffMs < oneDay && date.getDate() === new Date(nowMs).getDate()) {
    return time;
  }

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  return `${weekday} · ${time}`;
}

// Stable, render-on-server fallback (weekday + time, no "today" branch),
// then refines on the client once we know the real `now`. This avoids any
// Date.now() during server prerender — required by Next.js 16 Cache
// Components — while keeping the chip non-empty in the initial HTML.
function ssrFallback(locale: string, startsAt: string): string {
  const date = new Date(startsAt);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  return `${weekday} · ${time}`;
}

export function TonightTimeLabel({ locale, startsAt }: Props) {
  const [label, setLabel] = useState(() => ssrFallback(locale, startsAt));

  useEffect(() => {
    setLabel(format(locale, startsAt, Date.now()));
  }, [locale, startsAt]);

  return <span suppressHydrationWarning>{label}</span>;
}
