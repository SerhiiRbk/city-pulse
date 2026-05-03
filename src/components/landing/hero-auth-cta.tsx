import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/actions/auth';

export async function HeroAuthCTA() {
  const [user, tNav] = await Promise.all([
    getUser(),
    getTranslations('nav'),
  ]);

  if (user) return null;

  return (
    <Button
      size="lg"
      variant="outline"
      asChild
      className="h-12 rounded-full border-white/30 bg-white/10 px-8 text-base text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
    >
      <Link href="/register">{tNav('register')}</Link>
    </Button>
  );
}
