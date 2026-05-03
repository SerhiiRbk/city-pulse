import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { SITE_NAME } from '@/lib/constants';

export const ogImageSize = { width: 1200, height: 630 } as const;
export const ogImageContentType = 'image/png';

/**
 * Shared generator for the locale-aware default Open Graph / Twitter image.
 * Used by both `app/[locale]/opengraph-image.tsx` and `twitter-image.tsx` so
 * the social preview stays in sync.
 */
export async function renderDefaultOgImage(rawLocale: string) {
  const locale: Locale = hasLocale(locales, rawLocale) ? rawLocale : defaultLocale;
  const t = await getTranslations({ locale, namespace: 'landing' });
  const title = t('hero.title');
  const subtitle = t('hero.subtitle');

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          color: 'white',
          fontFamily: 'sans-serif',
          background:
            'radial-gradient(circle at 20% 0%, rgba(168,85,247,0.45) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(59,130,246,0.45) 0%, transparent 50%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: -0.5,
            opacity: 0.95,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            L
          </div>
          {SITE_NAME}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
              display: 'flex',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 32,
              marginTop: 28,
              opacity: 0.78,
              lineHeight: 1.4,
              maxWidth: 940,
              display: 'flex',
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: 0.7,
            fontSize: 24,
          }}
        >
          <span>localisio.com</span>
          <span style={{ textTransform: 'uppercase', letterSpacing: 4 }}>{locale}</span>
        </div>
      </div>
    ),
    { ...ogImageSize },
  );
}
