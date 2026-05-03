import 'server-only';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowRight, CalendarClock, MapPin } from 'lucide-react';
import { getCachedLandingEvents } from '@/lib/actions/landing-cached';

type Props = {
  locale: string;
};

function formatWhen(locale: string, startsAt: string, nowMs: number): string {
  const date = new Date(startsAt);
  const diffMs = date.getTime() - nowMs;
  const oneDay = 24 * 60 * 60 * 1000;

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

export async function TonightInCity({ locale }: Props) {
  const [events, t, tNav] = await Promise.all([
    getCachedLandingEvents(5),
    getTranslations('landing.marketing'),
    getTranslations('nav'),
  ]);

  // Fallback: show evergreen marketing panel when there's nothing upcoming
  if (events.length < 3) return <TonightFallback />;

  const nowMs = Date.now();
  const shortlist = events.slice(0, 4);

  return (
    <div className="rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5 text-white">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-white/55">
            {t('tonightLabel')}
          </p>
          <span className="flex h-2 w-2 items-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-bold leading-tight">
          {t('quickTitle')}
        </h2>

        <ul className="mt-5 space-y-2">
          {shortlist.map((event) => {
            const title =
              (event as { title?: string | null }).title ?? 'Event';
            const startsAt =
              (event as { starts_at?: string | null }).starts_at ?? null;
            const city =
              (event as { city?: string | null }).city ??
              (event as { venue_name?: string | null }).venue_name ??
              null;

            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/30 hover:bg-white/10"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-white/60">
                      {startsAt && <span>{formatWhen(locale, startsAt, nowMs)}</span>}
                      {city && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{city}</span>
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/80" />
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/events"
          className="mt-5 inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white"
        >
          {tNav('events')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

async function TonightFallback() {
  const t = await getTranslations('landing.marketing');

  const items = [
    { label: t('quickFormat1'), body: t('quickFormat1Body') },
    { label: t('quickFormat2'), body: t('quickFormat2Body') },
    { label: t('quickFormat3'), body: t('quickFormat3Body') },
    { label: t('quickFormat4'), body: t('quickFormat4Body') },
  ];

  return (
    <div className="rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-white/55">
          {t('tonightLabel')}
        </p>
        <h2 className="mt-3 text-2xl font-bold">{t('quickTitle')}</h2>
        <div className="mt-5 space-y-2">
          {items.map(({ label, body }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <p className="font-medium text-white">{label}</p>
              <p className="text-sm text-white/60">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
