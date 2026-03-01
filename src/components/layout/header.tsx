'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { CalendarDays, Users, MapPin, MessageCircle, Plus, LogOut, User, Settings, Landmark, ShieldCheck } from 'lucide-react';
import type { Profile } from '@/types/database';

interface HeaderProps {
  user?: Profile | null;
}

export function Header({ user }: HeaderProps) {
  const t = useTranslations('nav');

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg font-bold">
              CP
            </div>
            <span className="hidden text-xl font-bold sm:inline-block">City-Pulse</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('events')}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/groups" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('groups')}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/city-events" className="flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                {t('cityEvents')}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {t('calendar')}
              </Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Button variant="default" size="sm" className="hidden sm:flex" asChild>
              <Link href="/events/create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('createEvent')}
              </Link>
            </Button>
          )}

          {user && (
            <>
              <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
                <Link href="/messages">
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </Button>
              <div className="hidden md:flex">
                <NotificationBell />
              </div>
            </>
          )}

          <LanguageSwitcher />
          <ThemeToggle />

          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t('login')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t('register')}</Link>
              </Button>
            </div>
          )}

          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: Profile }) {
  const t = useTranslations('nav');

  const initials = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || undefined} alt={user.display_name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.display_name}</p>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/edit" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('settings')}
          </Link>
        </DropdownMenuItem>
        {user.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
