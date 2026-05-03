'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Menu,
  MapPin,
  Users,
  CalendarDays,
  MessageCircle,
  Plus,
  LogIn,
  UserPlus,
  User,
  Settings,
  LogOut,
  Landmark,
  Newspaper,
  CalendarCheck,
} from 'lucide-react';
import type { Profile } from '@/types/database';
import { SITE_NAME } from '@/lib/constants';

interface MobileNavProps {
  user?: Profile | null;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('nav');
  const close = () => setOpen(false);

  const initials = user
    ? user.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetTitle className="text-lg font-bold">{SITE_NAME}</SheetTitle>

        {user && (
          <div className="mt-4 flex items-center gap-3 px-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} alt={user.display_name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user.display_name}</p>
              <p className="text-muted-foreground text-xs">{user.email}</p>
            </div>
          </div>
        )}

        <nav className="mt-6 flex flex-col gap-2">
          <Button variant="ghost" className="justify-start" asChild onClick={close}>
            <Link href="/events" className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              {t('events')}
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start" asChild onClick={close}>
            <Link href="/groups" className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              {t('groups')}
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start" asChild onClick={close}>
            <Link href="/feed" className="flex items-center gap-3">
              <Newspaper className="h-5 w-5" />
              {t('feed')}
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start" asChild onClick={close}>
            <Link href="/city-events" className="flex items-center gap-3">
              <Landmark className="h-5 w-5" />
              {t('cityEvents')}
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start" asChild onClick={close}>
            <Link href="/calendar" className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5" />
              {t('calendar')}
            </Link>
          </Button>

          {user && (
            <>
              <Button variant="ghost" className="justify-start" asChild onClick={close}>
                <Link href="/messages" className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5" />
                  {t('messages')}
                </Link>
              </Button>
              <Separator className="my-2" />
              <Button variant="default" className="justify-start" asChild onClick={close}>
                <Link href="/events/create" className="flex items-center gap-3">
                  <Plus className="h-5 w-5" />
                  {t('createEvent')}
                </Link>
              </Button>
              <Separator className="my-2" />
              <Button variant="ghost" className="justify-start" asChild onClick={close}>
                <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                  <User className="h-5 w-5" />
                  {t('profile')}
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild onClick={close}>
                <Link href="/events/my" className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5" />
                  {t('myEvents')}
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild onClick={close}>
                <Link href="/profile/edit" className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  {t('settings')}
                </Link>
              </Button>
              <Separator className="my-2" />
              <form action="/api/auth/signout" method="POST">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-500"
                  type="submit"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  {t('logout')}
                </Button>
              </form>
            </>
          )}

          {!user && (
            <>
              <Separator className="my-2" />
              <Button variant="ghost" className="justify-start" asChild onClick={close}>
                <Link href="/login" className="flex items-center gap-3">
                  <LogIn className="h-5 w-5" />
                  {t('login')}
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild onClick={close}>
                <Link href="/register" className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5" />
                  {t('register')}
                </Link>
              </Button>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
