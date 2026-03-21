import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getProfile, getInterests } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  MapPin,
  Globe,
  Edit,
  Star,
  Calendar,
  Users,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { RequestChatButton } from '@/components/messages/request-chat-button';
import { ReportDialog } from '@/components/reports/report-dialog';
import { FollowButton } from '@/components/social/follow-button';
import { ProfileTabs } from '@/components/profile/profile-tabs';
import { getProfileStats, getUserBadges, isFollowing } from '@/lib/actions/social';
import {
  getProfileFavoriteEvents,
  getProfileGoingEvents,
  getProfilePastEvents,
  getProfileCreatedEvents,
  getProfileSubscribedGroups,
  getProfileManagedGroups,
} from '@/lib/actions/profile-data';
import { getUserEventStatuses } from '@/lib/actions/events';
import { getUserPhotos } from '@/lib/actions/user-photos';
import { ProfilePhotoGallery } from '@/components/profile/profile-photo-gallery';
import { generateProfileJsonLd } from '@/lib/json-ld';
import { COUNTRIES, SITE_NAME } from '@/lib/constants';
import type { Metadata } from 'next';
import { SocialIcon } from '@/components/ui/social-icons';
import type { SocialLinks } from '@/types/database';
import { buildPageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const profile = await getProfile(id);
  if (!profile) return { title: 'Not Found' };

  return buildPageMetadata({
    locale: locale as Locale,
    path: `/profile/${profile.id}`,
    title: `${profile.display_name} | ${SITE_NAME}`,
    description: profile.bio || `${profile.display_name}'s profile on ${SITE_NAME}`,
    image: profile.avatar_url,
    type: 'profile',
  });
}

export default async function ProfilePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('profile');
  const profile = await getProfile(id);

  if (!profile) {
    notFound();
  }

  const currentUser = await getUser();
  const isOwnProfile = currentUser?.id === profile.id;

  const [stats, badges, following, userPhotos, allInterests] = await Promise.all([
    getProfileStats(id),
    getUserBadges(id),
    currentUser && !isOwnProfile ? isFollowing(id) : Promise.resolve(false),
    getUserPhotos(id),
    getInterests(),
  ]);

  const interestBySlug = new Map(allInterests.map((i: any) => [i.slug, i]));
  const profileInterests = profile.interests
    .map((slug: string) => interestBySlug.get(slug))
    .filter(Boolean) as { id: string; slug: string; icon: string | null; translations: Record<string, string> }[];

  const [
    favoriteEvents,
    goingEvents,
    pastEvents,
    createdEvents,
    subscribedGroups,
    managedGroups,
  ] = await Promise.all([
    isOwnProfile ? getProfileFavoriteEvents(id) : Promise.resolve([]),
    getProfileGoingEvents(id),
    isOwnProfile ? getProfilePastEvents(id) : Promise.resolve([]),
    getProfileCreatedEvents(id),
    isOwnProfile ? getProfileSubscribedGroups(id) : Promise.resolve([]),
    getProfileManagedGroups(id),
  ]);

  const allEventIds = [
    ...favoriteEvents,
    ...goingEvents,
    ...pastEvents,
    ...createdEvents,
  ].map((e) => e.id);
  const { goingSet, favoritedSet } = currentUser
    ? await getUserEventStatuses([...new Set(allEventIds)])
    : { goingSet: new Set<string>(), favoritedSet: new Set<string>() };

  const initials = profile.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const jsonLd = generateProfileJsonLd(profile);

  const countryObj = profile.country
    ? COUNTRIES.find((c) => c.code === profile.country)
    : null;
  const countryLabel = countryObj
    ? (countryObj[locale as keyof typeof countryObj] as string) || countryObj.en
    : profile.country;

  const socialEntries = Object.entries(profile.social_links || {}).filter(
    ([, v]) => Boolean(v),
  ) as [keyof SocialLinks, string][];
  const socialCue = profile.is_available
    ? t('connectionOpen')
    : t('connectionReserved');

  const aboutContent = (
    <div className="mx-auto max-w-3xl">
      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm">
        {/* Top section: photo gallery / avatar + identity */}
        <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-start md:gap-8 md:p-8">
          {/* Photo area */}
          <div className="shrink-0">
            {userPhotos.length > 0 ? (
              <ProfilePhotoGallery
                photos={userPhotos}
                avatarUrl={profile.avatar_url}
                displayName={profile.display_name}
                isAvailable={profile.is_available}
                availableLabel={t('available')}
              />
            ) : (
              <div className="group relative">
                <div className="h-40 w-40 overflow-hidden rounded-2xl border-4 border-background shadow-xl ring-1 ring-border/30 md:h-48 md:w-48">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="text-5xl font-bold text-primary/60">{initials}</span>
                    </div>
                  )}
                </div>
                {profile.is_available && (
                  <span className="pointer-events-none absolute bottom-1 left-1/2 z-10 max-w-[calc(100%-12px)] -translate-x-1/2 truncate rounded-full bg-success px-2 py-0.5 text-[9px] font-semibold text-success-foreground shadow-md">
                    {t('available')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Identity + meta */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 md:items-start md:gap-3">
            <div>
              <h1 className="text-center text-xl font-bold tracking-tight md:text-left md:text-3xl">
                {profile.display_name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground md:justify-start">
                {!profile.hide_age && profile.age && (
                  <span>{t('yearsOld', { age: profile.age })}</span>
                )}
                {(profile.city || countryLabel) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[profile.city, countryLabel].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Bio inline */}
            {profile.bio && (
              <p className="max-w-lg text-center text-sm leading-relaxed text-muted-foreground md:text-left">
                {profile.bio}
              </p>
            )}

            <div className="rounded-2xl border border-border/50 bg-muted/30 px-3.5 py-2.5 text-sm text-muted-foreground md:max-w-xl md:px-4 md:py-3">
              <p className="font-semibold text-foreground">{t('connectionStyle')}</p>
              <p className="mt-1">{socialCue}</p>
            </div>

            {/* Actions */}
            <div className="mt-1 flex flex-wrap justify-center gap-2 md:justify-start">
              {isOwnProfile && (
                <Button variant="outline" size="sm" asChild className="rounded-full shadow-sm">
                  <Link href="/profile/edit" className="flex items-center gap-2">
                    <Edit className="h-3.5 w-3.5" />
                    {t('edit')}
                  </Link>
                </Button>
              )}
              {!isOwnProfile && currentUser && (
                <>
                  <FollowButton targetUserId={profile.id} isFollowing={following} />
                  <RequestChatButton targetUserId={profile.id} />
                  <ReportDialog targetType="user" targetId={profile.id} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 divide-x-0 border-t border-border/40 bg-muted/20 md:grid-cols-4 md:divide-x md:divide-border/40">
          {[
            { value: stats.events_created, label: t('eventsCreated'), icon: Calendar },
            { value: stats.events_attended, label: t('eventsAttended'), icon: Users },
            { value: stats.avg_organizer_rating > 0 ? stats.avg_organizer_rating : '-', label: t('rating'), icon: Star, isStar: true },
            { value: stats.follower_count, label: t('followers'), icon: Sparkles },
          ].map(({ value, label, icon: Icon, isStar }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 py-4">
              <div className="flex items-center gap-1">
                {isStar ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
                <span className="text-lg font-bold">{value}</span>
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail sections */}
      <div className="mt-5 grid gap-4 md:mt-6 md:gap-6 md:grid-cols-2">
        {/* Languages */}
        {profile.languages.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Globe className="h-4 w-4" />
              {t('languages')}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.languages.map((lang) => (
                <span key={lang} className="rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-sm font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {profileInterests.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              {t('interests')}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profileInterests.map((interest) => (
                <span key={interest.id} className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                  {interest.icon && <span className="text-xs leading-none">{interest.icon}</span>}
                  {interest.translations[locale] || interest.translations.en || interest.slug}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Social links */}
        {socialEntries.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {t('socialLinks')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {socialEntries.map(([key, value]) => {
                const urls: Record<string, string> = {
                  facebook: `https://facebook.com/${value}`,
                  instagram: `https://instagram.com/${value}`,
                  telegram: `https://t.me/${value}`,
                  whatsapp: `https://wa.me/${value}`,
                  twitch: `https://twitch.tv/${value}`,
                  youtube: value.startsWith('http') ? value : `https://youtube.com/@${value}`,
                };
                return (
                  <a
                    key={key}
                    href={urls[key] || value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <SocialIcon network={key} className="h-4 w-4" />
                    <span className="capitalize">{key}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Star className="h-4 w-4" />
              {t('badgesTitle')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((ub: { badge_id: string; badges: { icon: string; translations: Record<string, string> } }) => (
                <span key={ub.badge_id} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <span>{ub.badges.icon}</span>
                  {ub.badges.translations[locale] || ub.badges.translations['en']}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground sm:mb-5">
        <Link href="/groups" className="transition-colors hover:text-foreground">{t('breadcrumbs')}</Link>
        <span>/</span>
        <span className="truncate">{profile.display_name}</span>
      </div>
      <ProfileTabs
        isOwnProfile={isOwnProfile}
        isAuthenticated={!!currentUser}
        aboutContent={aboutContent}
        favoriteEvents={isOwnProfile ? favoriteEvents : undefined}
        goingEvents={goingEvents}
        pastEvents={isOwnProfile ? pastEvents : undefined}
        createdEvents={createdEvents}
        subscribedGroups={isOwnProfile ? subscribedGroups : undefined}
        managedGroups={managedGroups}
        goingEventIds={Array.from(goingSet)}
        favoritedEventIds={Array.from(favoritedSet)}
      />
    </div>
  );
}
