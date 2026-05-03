import { ImageResponse } from 'next/og';

/**
 * High-resolution touch icon for iOS home-screen installs. iOS
 * downsamples this to whatever resolution the device needs, so a
 * single 180x180 source covers every Apple Touch Icon slot.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          background:
            'linear-gradient(135deg, #f59e0b 0%, #ef4444 60%, #a855f7 100%)',
          borderRadius: 36,
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
