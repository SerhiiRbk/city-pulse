type RelativeTimeTranslator = (
  key: 'timeNow' | 'timeMinutesAgo' | 'timeHoursAgo' | 'timeDaysAgo',
  values?: Record<string, string | number>,
) => string;

export function formatRelativeTime(
  dateStr: string,
  locale: string,
  t: RelativeTimeTranslator,
) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return t('timeNow');
  if (diffMin < 60) return t('timeMinutesAgo', { count: diffMin });

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('timeHoursAgo', { count: diffH });

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return t('timeDaysAgo', { count: diffD });

  return date.toLocaleDateString(locale);
}
