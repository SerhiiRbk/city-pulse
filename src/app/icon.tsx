import { ImageResponse } from 'next/og';

/**
 * Modern PWA / browser-tab icon generated at the edge. Renders the
 * "L" wordmark on the brand orange→red gradient. Browsers cache it
 * indefinitely (Next.js fingerprints the URL), so a small PNG is
 * cheap to ship and serves every favicon slot the spec defines.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 22,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          borderRadius: 6,
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
