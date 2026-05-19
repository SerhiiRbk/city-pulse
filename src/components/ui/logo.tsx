import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = {
  sm: { icon: 'h-8 w-8', text: 'text-lg' },
  md: { icon: 'h-9 w-9', text: 'text-xl' },
  lg: { icon: 'h-12 w-12', text: 'text-2xl' },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const s = sizes[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className={cn('relative shrink-0', s.icon)}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          {/* Background circle */}
          <rect width="48" height="48" rx="12" className="fill-primary" />

          {/* City skyline — subtle, behind the pulse */}
          <g className="fill-primary-foreground" opacity="0.25">
            <rect x="6" y="20" width="5" height="18" rx="0.5" />
            <rect x="12" y="14" width="7" height="24" rx="0.5" />
            <rect x="20" y="8" width="6" height="30" rx="0.5" />
            <rect x="22" y="4" width="2" height="5" />
            <rect x="27" y="18" width="8" height="20" rx="0.5" />
            <rect x="36" y="12" width="6" height="26" rx="0.5" />
          </g>

          {/* Pulse/heartbeat line */}
          <polyline
            points="4,28 12,28 16,28 20,28 22,18 24.5,36 27,12 29.5,32 32,28 36,28 40,28 44,28"
            className="stroke-primary-foreground"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>

      {showText && (
        <span className={cn('font-extrabold tracking-tight', s.text)}>Localisio</span>
      )}
    </span>
  );
}
