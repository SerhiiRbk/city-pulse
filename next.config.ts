import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // AVIF first, then WebP fallback. Saves ~50% bytes on hero photos
    // and unlocks the Vercel Image Optimization edge cache.
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      // Crew invite links are shared without locale prefix.
      {
        source: '/invite/crew/:token',
        destination: '/en/invite/crew/:token',
      },
    ];
  },
  async redirects() {
    return [
      // Redirect old city-events URLs to new /cities/:city/events structure
      {
        source: '/:locale(en|ru|uk|cs|de|es)/city-events/city-:city',
        destination: '/:locale/cities/:city/events',
        permanent: true,
      },
      {
        source: '/:locale(en|ru|uk|cs|de|es)/city-events',
        destination: '/:locale/events',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
