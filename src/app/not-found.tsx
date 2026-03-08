import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-muted-foreground/20">
        <svg className="h-40 w-40" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="45" stroke="currentColor" strokeWidth="3" />
          <circle cx="45" cy="50" r="5" fill="currentColor" opacity="0.5" />
          <circle cx="75" cy="50" r="5" fill="currentColor" opacity="0.5" />
          <path d="M40 78c5-8 15-12 20-12s15 4 20 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M30 35l-8-10M90 35l8-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
        </svg>
      </div>
      <h1 className="mb-2 text-4xl font-bold">Page not found</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
