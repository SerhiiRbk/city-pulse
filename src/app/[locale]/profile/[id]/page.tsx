import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getProfile } from '@/lib/actions/profile';
import { getUser } from '@/lib/actions/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/navigation';
import {
  MapPin,
  Globe,
  Edit,
  CalendarDays,
  Star,
  Instagram,
  Youtube,
} from 'lucide-react';
import { RequestChatButton } from '@/components/messages/request-chat-button';
import { ReportDialog } from '@/components/reports/report-dialog';
import { FollowButton } from '@/components/social/follow-button';
import { getProfileStats, getUserBadges, isFollowing } from '@/lib/actions/social';
import { generateProfileJsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/constants';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

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

  const [stats, badges, following] = await Promise.all([
    getProfileStats(id),
    getUserBadges(id),
    currentUser && !isOwnProfile ? isFollowing(id) : Promise.resolve(false),
  ]);

  const initials = profile.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const jsonLd = generateProfileJsonLd(profile);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                {profile.is_available && (
                  <Badge variant="default" className="bg-green-500">
                    {t('available')}
                  </Badge>
                )}
              </div>

              {profile.city && (
                <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1 sm:justify-start">
                  <MapPin className="h-4 w-4" />
                  {profile.city}
                  {profile.country && `, ${profile.country}`}
                </p>
              )}

              {!profile.hide_age && profile.age && (
                <p className="text-muted-foreground text-sm">{profile.age} years old</p>
              )}

              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {isOwnProfile && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/profile/edit" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
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

          {profile.bio && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="mb-2 font-semibold">{t('bio')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              </div>
            </>
          )}

          {profile.languages.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Globe className="h-4 w-4" />
                  {t('languages')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang) => (
                    <Badge key={lang} variant="secondary">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {profile.interests.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="mb-2 font-semibold">{t('interests')}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <Badge key={interest} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {Object.values(profile.social_links || {}).some(Boolean) && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="mb-2 font-semibold">{t('socialLinks')}</h3>
                <div className="flex flex-wrap gap-3">
                  {profile.social_links.instagram && (
                    <a
                      href={`https://instagram.com/${profile.social_links.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_links.youtube && (
                    <a
                      href={profile.social_links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Youtube className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {badges.map((ub: { badge_id: string; badges: { icon: string; translations: Record<string, string> } }) => (
                <Badge key={ub.badge_id} variant="secondary" className="gap-1 text-sm">
                  <span>{ub.badges.icon}</span>
                  {ub.badges.translations[locale] || ub.badges.translations['en']}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.events_created}</p>
              <p className="text-muted-foreground text-xs">{t('eventsCreated')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.events_attended}</p>
              <p className="text-muted-foreground text-xs">{t('eventsAttended')}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <p className="text-2xl font-bold">{stats.avg_organizer_rating > 0 ? stats.avg_organizer_rating : '-'}</p>
              </div>
              <p className="text-muted-foreground text-xs">{t('rating')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.follower_count}</p>
              <p className="text-muted-foreground text-xs">Followers</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
