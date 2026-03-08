'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/event-card';
import { GroupCard } from '@/components/groups/group-card';
import { EmptyState } from '@/components/ui/empty-state';
import { User, Heart, CalendarCheck, History, Pencil, Users, Bell, Calendar } from 'lucide-react';

interface ProfileTabsProps {
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  aboutContent: ReactNode;
  favoriteEvents?: any[];
  goingEvents?: any[];
  pastEvents?: any[];
  createdEvents: any[];
  subscribedGroups?: any[];
  managedGroups: any[];
  goingEventIds?: string[];
  favoritedEventIds?: string[];
}

export function ProfileTabs({
  isOwnProfile,
  isAuthenticated,
  aboutContent,
  favoriteEvents = [],
  goingEvents = [],
  pastEvents = [],
  createdEvents,
  subscribedGroups = [],
  managedGroups,
  goingEventIds = [],
  favoritedEventIds = [],
}: ProfileTabsProps) {
  const t = useTranslations('profile.tabs');
  const goingSet = new Set(goingEventIds);
  const favSet = new Set(favoritedEventIds);

  const ownerTabs = [
    { id: 'about', icon: User, label: t('about') },
    { id: 'favorites', icon: Heart, label: t('favorites'), count: favoriteEvents.length },
    { id: 'going', icon: CalendarCheck, label: t('going'), count: goingEvents.length },
    { id: 'past', icon: History, label: t('past'), count: pastEvents.length },
    { id: 'created', icon: Pencil, label: t('created'), count: createdEvents.length },
    { id: 'subscribed', icon: Bell, label: t('subscribed'), count: subscribedGroups.length },
    { id: 'managed', icon: Users, label: t('managed'), count: managedGroups.length },
  ];

  const publicTabs = [
    { id: 'about', icon: User, label: t('about') },
    { id: 'going', icon: CalendarCheck, label: t('going'), count: goingEvents.length },
    { id: 'created', icon: Pencil, label: t('created'), count: createdEvents.length },
    { id: 'managed', icon: Users, label: t('managed'), count: managedGroups.length },
  ];

  const tabs = isOwnProfile ? ownerTabs : publicTabs;

  function EventGrid({ events }: { events: any[] }) {
    if (events.length === 0) {
      return (
        <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
          <EmptyState icon="events" title={t('noEvents')} description="Nothing here yet, but the next plan could become the start of a whole routine." className="py-10" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isGoing={goingSet.has(event.id)}
            isFavorited={favSet.has(event.id)}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    );
  }

  function GroupGrid({ groups }: { groups: any[] }) {
    if (groups.length === 0) {
      return (
        <div className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-sm">
          <EmptyState icon="groups" title={t('noGroups')} description="Groups turn occasional plans into familiar faces and recurring connections." className="py-10" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    );
  }

  function CountBadge({ count }: { count?: number }) {
    if (!count) return null;
    return (
      <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
        {count}
      </span>
    );
  }

  return (
    <Tabs defaultValue="about">
      <TabsList variant="line" className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-card p-1 scrollbar-none">
        {tabs.map(({ id, icon: Icon, label, count }) => (
          <TabsTrigger key={id} value={id} className="relative gap-1.5 rounded-xl px-4 py-2.5">
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            <CountBadge count={count} />
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="about" className="pt-6">
        {aboutContent}
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="favorites" className="pt-6">
          <EventGrid events={favoriteEvents} />
        </TabsContent>
      )}

      <TabsContent value="going" className="pt-6">
        <EventGrid events={goingEvents} />
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="past" className="pt-6">
          <EventGrid events={pastEvents} />
        </TabsContent>
      )}

      <TabsContent value="created" className="pt-6">
        <EventGrid events={createdEvents} />
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="subscribed" className="pt-6">
          <GroupGrid groups={subscribedGroups} />
        </TabsContent>
      )}

      <TabsContent value="managed" className="pt-6">
        <GroupGrid groups={managedGroups} />
      </TabsContent>
    </Tabs>
  );
}
