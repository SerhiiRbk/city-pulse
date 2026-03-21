'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: 'events' | 'groups' | 'messages' | 'search' | 'calendar' | 'photos';
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

function EmptyIllustration({ icon }: { icon: EmptyStateProps['icon'] }) {
  const shared = 'h-32 w-32 text-muted-foreground/20';

  switch (icon) {
    case 'events':
      return (
        <svg className={shared} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="25" width="80" height="75" rx="12" stroke="currentColor" strokeWidth="3" />
          <path d="M20 45h80" stroke="currentColor" strokeWidth="3" />
          <rect x="38" y="15" width="4" height="20" rx="2" fill="currentColor" />
          <rect x="78" y="15" width="4" height="20" rx="2" fill="currentColor" />
          <circle cx="45" cy="62" r="5" fill="currentColor" opacity="0.4" />
          <circle cx="60" cy="62" r="5" fill="currentColor" opacity="0.6" />
          <circle cx="75" cy="62" r="5" fill="currentColor" opacity="0.3" />
          <circle cx="45" cy="80" r="5" fill="currentColor" opacity="0.2" />
          <circle cx="60" cy="80" r="5" fill="currentColor" opacity="0.4" />
          <circle cx="75" cy="80" r="5" fill="currentColor" opacity="0.15" />
        </svg>
      );
    case 'groups':
      return (
        <svg className={shared} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="42" r="14" stroke="currentColor" strokeWidth="3" />
          <path d="M36 88c0-13.255 10.745-24 24-24s24 10.745 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="50" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
          <path d="M12 82c0-9.941 8.059-18 18-18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          <circle cx="90" cy="50" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
          <path d="M108 82c0-9.941-8.059-18-18-18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      );
    case 'messages':
      return (
        <svg className={shared} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="25" width="70" height="50" rx="12" stroke="currentColor" strokeWidth="3" />
          <path d="M30 85l-8 15v-15" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <rect x="35" y="30" width="50" height="45" rx="10" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
          <line x1="30" y1="45" x2="60" y2="45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <line x1="30" y1="55" x2="50" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        </svg>
      );
    case 'search':
      return (
        <svg className={shared} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="52" cy="52" r="28" stroke="currentColor" strokeWidth="3" />
          <line x1="72" y1="72" x2="100" y2="100" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="52" x2="64" y2="52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={shared} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="25" width="90" height="80" rx="14" stroke="currentColor" strokeWidth="3" />
          <path d="M15 48h90" stroke="currentColor" strokeWidth="3" />
          <rect x="35" y="15" width="4" height="20" rx="2" fill="currentColor" />
          <rect x="81" y="15" width="4" height="20" rx="2" fill="currentColor" />
          <path d="M45 68l8 8 18-18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      );
    case 'photos':
      return (
        <svg className={shared} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="15" y="25" width="90" height="70" rx="12" stroke="currentColor" strokeWidth="3" />
          <circle cx="42" cy="50" r="8" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
          <path d="M15 80l25-20 20 15 15-10 30 20" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" opacity="0.4" />
        </svg>
      );
  }
}

export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <EmptyIllustration icon={icon} />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
