import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getProfile } from '@/lib/actions/profile';
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
import { countryCodeToFlag } from '@/lib/utils';
import { COUNTRIES, SITE_NAME } from '@/lib/constants';
import type { Metadata } from 'next';
import type { SocialLinks } from '@/types/database';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const SOCIAL_SVGS: Record<string, string> = {
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  telegram: 'M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
  twitch: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z',
  youtube: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
};

function SocialIcon({ network }: { network: string }) {
  const d = SOCIAL_SVGS[network];
  if (!d) return null;
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return { title: 'Not Found' };
  return {
    title: `${profile.display_name} | ${SITE_NAME}`,
    description: profile.bio || `${profile.display_name}'s profile on ${SITE_NAME}`,
  };
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

  const [stats, badges, following, userPhotos] = await Promise.all([
    getProfileStats(id),
    getUserBadges(id),
    currentUser && !isOwnProfile ? isFollowing(id) : Promise.resolve(false),
    getUserPhotos(id),
  ]);

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
  const countryFlag = profile.country ? countryCodeToFlag(profile.country) : null;

  const socialEntries = Object.entries(profile.social_links || {}).filter(
    ([, v]) => Boolean(v),
  ) as [keyof SocialLinks, string][];

  const aboutContent = (
    <div className="mx-auto max-w-3xl">
      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm">
        {/* Top section: photo gallery / avatar + identity */}
        <div className="flex flex-col items-center gap-8 p-8 sm:flex-row sm:items-start">
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
                <div className="h-40 w-40 overflow-hidden rounded-2xl border-4 border-background shadow-xl ring-1 ring-border/30 sm:h-48 sm:w-48">
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
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-white shadow-md">
                    {t('available')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Identity + meta */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
            <div>
              <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-left sm:text-3xl">
                {profile.display_name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
                {!profile.hide_age && profile.age && (
                  <span>{profile.age} y.o.</span>
                )}
                {(profile.city || countryLabel) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[profile.city, countryLabel].filter(Boolean).join(', ')}
                    {countryFlag && <span className="ml-0.5">{countryFlag}</span>}
                  </span>
                )}
              </div>
            </div>

            {/* Bio inline */}
            {profile.bio && (
              <p className="max-w-lg text-center text-sm leading-relaxed text-muted-foreground sm:text-left">
                {profile.bio}
              </p>
            )}

            {/* Actions */}
            <div className="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start">
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
        <div className="grid grid-cols-4 divide-x divide-border/40 border-t border-border/40 bg-muted/20">
          {[
            { value: stats.events_created, label: t('eventsCreated'), icon: Calendar },
            { value: stats.events_attended, label: t('eventsAttended'), icon: Users },
            { value: stats.avg_organizer_rating > 0 ? stats.avg_organizer_rating : '-', label: t('rating'), icon: Star, isStar: true },
            { value: stats.follower_count, label: 'Followers', icon: Sparkles },
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
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail sections */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Languages */}
        {profile.languages.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
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
        {profile.interests.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              {t('interests')}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => (
                <span key={interest} className="rounded-full bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Social links */}
        {socialEntries.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
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
                    <SocialIcon network={key} />
                    <span className="capitalize">{key}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Star className="h-4 w-4" />
              Badges
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
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
