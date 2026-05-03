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
};

export default withNextIntl(nextConfig);
