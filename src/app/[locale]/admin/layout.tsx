import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Layers,
  Flag,
  Award,
  Landmark,
  BarChart3,
} from 'lucide-react';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Admin');

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect({ href: '/', locale });
    return null;
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/events', icon: CalendarDays, label: 'Events' },
    { href: '/admin/groups', icon: Layers, label: 'Groups' },
    { href: '/admin/reports', icon: Flag, label: 'Reports' },
    { href: '/admin/badges', icon: Award, label: 'Badges' },
    { href: '/admin/system-events', icon: Landmark, label: 'City Events' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="text-primary h-7 w-7" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Button key={href} variant="ghost" className="justify-start" asChild>
              <Link href={href} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="lg:col-span-4">{children}</div>
      </div>
    </div>
  );
}
