'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, ChevronsUpDown, Check, ImagePlus, Star, Trash2, Shield, Search, UserPlus, MapPin } from 'lucide-react';
import { LocationPicker } from '@/components/maps/location-picker';
import { CityPicker } from '@/components/ui/city-picker';
import {
  updateEvent,
  uploadEventPhoto,
  addEventModerator,
  removeEventModerator,
} from '@/lib/actions/events';
import { resolveCity } from '@/lib/actions/cities';
import { searchUsers } from '@/lib/actions/groups';
import { toast } from 'sonner';
import { cn, countryCodeToFlag } from '@/lib/utils';
import { COUNTRIES } from '@/lib/constants';
import type { Event, Interest, InterestCategory, City } from '@/types/database';

interface EventModerator {
  user_id: string;
  profiles: { id: string; display_name: string; avatar_url: string | null };
}

interface EditEventFormProps {
  event: Event;
  interests: Interest[];
  categories: InterestCategory[];
  moderators?: EventModerator[];
  initialCity?: City | null;
}

export function EditEventForm({ event, interests, categories, moderators: initialModerators = [], initialCity }: EditEventFormProps) {
  const t = useTranslations('events.create');
  const tEdit = useTranslations('events.edit');
  const locale = useLocale();
  const router = useRouter();

  const startsAt = new Date(event.starts_at);
  const dateStr = startsAt.toISOString().split('T')[0];
  const timeStr = startsAt.toTimeString().slice(0, 5);

  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(event.is_online);
  const [isFree, setIsFree] = useState(event.is_free);
  const [isPrivate, setIsPrivate] = useState(event.is_private);
  const [selectedCategory, setSelectedCategory] = useState(event.category_id || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    event.category_id ? [event.category_id] : [],
  );
  const [interestsPopoverOpen, setInterestsPopoverOpen] = useState(false);
  const [eventCountry, setEventCountry] = useState(event.country || '');
  const [eventCity, setEventCity] = useState<City | null>(initialCity || null);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    city?: string;
    country?: string;
  }>({
    lat: event.lat ?? 0,
    lng: event.lng ?? 0,
    address: event.address ?? '',
    city: event.city ?? undefined,
    country: event.country ?? undefined,
  });
  const [photos, setPhotos] = useState<string[]>(event.photos || []);
  const [coverIndex, setCoverIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  function handleCityChange(city: City | null) {
    setEventCity(city);
    if (!city) {
      setLocation({ lat: 0, lng: 0, address: '', city: undefined, country: undefined });
    } else {
      setLocation((prev) => ({ ...prev, lat: 0, lng: 0, address: '' }));
    }
  }

  const [moderatorsList, setModeratorsList] = useState<EventModerator[]>(initialModerators);
  const [modSearchQuery, setModSearchQuery] = useState('');
  const [modSearchResults, setModSearchResults] = useState<
    { id: string; display_name: string; avatar_url: string | null }[]
  >([]);
  const [modSearching, setModSearching] = useState(false);

  async function handleModSearch(query: string) {
    setModSearchQuery(query);
    if (query.length < 2) {
      setModSearchResults([]);
      return;
    }
    setModSearching(true);
    try {
      const results = await searchUsers(query);
      const existingIds = new Set([
        event.organizer_id,
        ...moderatorsList.map((m) => m.user_id),
      ]);
      setModSearchResults(results.filter((u) => !existingIds.has(u.id)));
    } finally {
      setModSearching(false);
    }
  }

  async function handleAddMod(user: { id: string; display_name: string; avatar_url: string | null }) {
    const result = await addEventModerator(event.id, user.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setModeratorsList((prev) => [
      ...prev,
      { user_id: user.id, profiles: { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url } },
    ]);
    setModSearchQuery('');
    setModSearchResults([]);
    toast.success(tEdit('moderatorAdded'));
  }

  async function handleRemoveMod(userId: string) {
    const result = await removeEventModerator(event.id, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setModeratorsList((prev) => prev.filter((m) => m.user_id !== userId));
    toast.success(tEdit('moderatorRemoved'));
  }

  function getInterestLabel(interest: Interest): string {
    return interest.translations[locale] || interest.translations['en'] || interest.slug;
  }

  function getCategoryLabel(cat: InterestCategory): string {
    return cat.translations[locale] || cat.translations['en'] || cat.slug;
  }

  function toggleInterest(id: string) {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
    if (!selectedCategory && id) setSelectedCategory(id);
  }

  const uncategorizedCatId = categories.find((c) => c.slug === 'other')?.id;

  const groupedInterests = categories
    .map((cat) => ({
      ...cat,
      label: getCategoryLabel(cat),
      items: interests.filter((i) => {
        if (i.category_id) return i.category_id === cat.id;
        return cat.id === uncategorizedCatId;
      }),
    }))
    .filter((g) => g.items.length > 0);

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((prev) => {
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || photos.length >= 5) return;

    setUploading(true);
    for (let i = 0; i < files.length && photos.length + i < 5; i++) {
      const formData = new FormData();
      formData.append('photo', files[i]);
      const result = await uploadEventPhoto(formData, event.id);
      if (result.url) {
        setPhotos((prev) => [...prev, result.url!]);
      } else if (result.error) {
        toast.error(result.error);
      }
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const primaryCategory = selectedInterests[0] || selectedCategory;

    let cityId: string | null = eventCity?.id || null;
    if (!cityId && location.city && location.country && location.lat && location.lng) {
      cityId = await resolveCity(location.city, location.country, location.lat, location.lng);
    }

    const finalCountry = (eventCountry && eventCountry !== '__none' ? eventCountry : null) || null;
    const finalCityName = eventCity?.name || location.city || null;

    const data = {
      title: form.get('title') as string,
      description: form.get('description') as string,
      category_id: primaryCategory,
      starts_at: `${form.get('date')}T${form.get('time')}`,
      duration_minutes: Number(form.get('duration')) || 60,
      is_online: isOnline,
      is_free: isFree,
      price: isFree ? null : Number(form.get('price')) || null,
      currency: isFree ? 'EUR' : (form.get('currency') as string) || 'EUR',
      max_attendees: form.get('max_attendees') ? Number(form.get('max_attendees')) : null,
      is_private: isPrivate,
      country: finalCountry,
      city: finalCityName,
      city_id: cityId,
      address: location.address || null,
      lat: location.lat ?? null,
      lng: location.lng ?? null,
      photos:
        photos.length > 0
          ? [photos[coverIndex], ...photos.filter((_, i) => i !== coverIndex)]
          : [],
    };

    const result = await updateEvent(event.id, data);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Event updated!');
      router.push(`/events/${event.id}`);
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Refine the experience</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Update the event so people know exactly what to expect</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Strong event pages reduce hesitation. Keep the title, vibe, location, and attendee expectations clear and friendly.
        </p>
      </div>
      {/* Basic info */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('name')}</Label>
            <Input id="title" name="title" defaultValue={event.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={event.description}
              rows={4}
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>

          {/* Category multi-select */}
          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedInterests.map((id) => {
                const interest = interests.find((i) => i.id === id);
                if (!interest) return null;
                return (
                  <span
                    key={id}
                    className="bg-background inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm"
                  >
                    {interest.icon && (
                      <span className="text-base leading-none">{interest.icon}</span>
                    )}
                    {getInterestLabel(interest)}
                    <button
                      type="button"
                      onClick={() => toggleInterest(id)}
                      className="text-muted-foreground hover:text-foreground -mr-1 ml-0.5 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}
              {selectedInterests.length === 0 && (
                <span className="text-muted-foreground text-sm">No category selected</span>
              )}
            </div>
            <Popover open={interestsPopoverOpen} onOpenChange={setInterestsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" type="button" className="w-full justify-between">
                  {selectedInterests.length > 0
                    ? `${selectedInterests.length} selected`
                    : 'Select categories...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="max-h-80 w-[--radix-popover-trigger-width] overflow-y-auto p-2"
                align="start"
              >
                {groupedInterests.map((group) => (
                  <div key={group.id} className="mb-2 last:mb-0">
                    <p className="text-muted-foreground mb-1 px-2 text-xs font-semibold uppercase tracking-wider">
                      {group.label}
                    </p>
                    {group.items.map((interest) => {
                      const selected = selectedInterests.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          type="button"
                          className={cn(
                            'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                            selected && 'bg-accent',
                          )}
                          onClick={() => toggleInterest(interest.id)}
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              selected ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {interest.icon && (
                            <span className="text-base leading-none">{interest.icon}</span>
                          )}
                          {getInterestLabel(interest)}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">{t('date')}</Label>
              <Input id="date" name="date" type="date" defaultValue={dateStr} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">{t('time')}</Label>
              <Input id="time" name="time" type="time" defaultValue={timeStr} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{t('duration')}</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                defaultValue={event.duration_minutes}
                min={15}
                step={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type & Price */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="is_online">{t('isOnline')}</Label>
            <Switch id="is_online" checked={isOnline} onCheckedChange={setIsOnline} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="is_free">{t('isFree')}</Label>
            <Switch id="is_free" checked={isFree} onCheckedChange={setIsFree} />
          </div>
          {!isFree && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">{t('price')}</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={event.price ?? ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  name="currency"
                  defaultValue={event.currency || 'EUR'}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="max_attendees">{t('maxAttendees')}</Label>
            <Input
              id="max_attendees"
              name="max_attendees"
              type="number"
              min={1}
              defaultValue={event.max_attendees ?? ''}
              placeholder="Unlimited"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_private">{t('isPrivate')}</Label>
              <p className="text-muted-foreground text-xs">{t('privateHint')}</p>
            </div>
            <Switch id="is_private" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
        </CardContent>
      </Card>

      {/* Country & City + Location */}
      {!isOnline && (
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('location')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('country')}</Label>
                <Select value={eventCountry} onValueChange={setEventCountry}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('country')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {countryCodeToFlag(c.code)} {(c as Record<string, string>)[locale] || c.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('city')}</Label>
                <CityPicker
                  value={eventCity}
                  onChange={handleCityChange}
                  countryFilter={eventCountry && eventCountry !== '__none' ? eventCountry : undefined}
                  placeholder={t('city')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('address')}</Label>
              <p className="text-muted-foreground mb-1 text-xs">{t('clickMap')}</p>
              <LocationPicker
                lat={location.lat}
                lng={location.lng}
                address={location.address}
                centerLat={eventCity?.lat}
                centerLng={eventCity?.lng}
                centerZoom={12}
                onLocationChange={setLocation}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t('photos')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors">
            {uploading ? (
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            ) : (
              <>
                <div className="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <ImagePlus className="text-primary h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Click to upload photos</p>
                <p className="text-muted-foreground text-xs">
                  JPEG, PNG or WebP &bull; Max 5MB each &bull; Up to {5 - photos.length} more
                </p>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploading || photos.length >= 5}
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            {photos.map((url, i) => {
              const isCover = i === coverIndex;
              return (
                <div
                  key={i}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl border-2 transition-colors',
                    isCover
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground/30',
                  )}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {isCover && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-success-foreground shadow">
                        <Star className="h-3 w-3" fill="white" /> Cover
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => setCoverIndex(i)}
                        className="w-full rounded-md bg-white/90 px-2 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white"
                      >
                        Set as cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="flex w-full items-center justify-center gap-1 rounded-md bg-red-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, 5 - photos.length) }).map((_, i) => (
              <label
                key={`empty-${i}`}
                className="bg-muted/40 hover:bg-muted/70 flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed transition-colors"
              >
                <span className="text-muted-foreground text-2xl leading-none">+</span>
                <span className="text-muted-foreground mt-1 text-xs">Add photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Moderators */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {tEdit('moderators')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {moderatorsList.length === 0 ? (
            <p className="text-muted-foreground text-sm">{tEdit('noModerators')}</p>
          ) : (
            <div className="space-y-2">
              {moderatorsList.map((mod) => (
                <div key={mod.user_id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={mod.profiles?.avatar_url || undefined} />
                    <AvatarFallback>{mod.profiles?.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium">{mod.profiles?.display_name}</span>
                  <Badge variant="outline" className="text-xs">{tEdit('moderators')}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => handleRemoveMod(mod.user_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>{tEdit('addModerator')}</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder={tEdit('searchUsers')}
                value={modSearchQuery}
                onChange={(e) => handleModSearch(e.target.value)}
                className="pl-9"
              />
              {modSearching && (
                <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {modSearchResults.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {modSearchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAddMod(user)}
                    className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.display_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">{user.display_name}</span>
                    <UserPlus className="text-muted-foreground h-4 w-4" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-20 flex gap-4 rounded-[1.5rem] border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-md">
        <Button type="submit" size="lg" className="flex-1 rounded-2xl" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tEdit('save')}
        </Button>
        <Button type="button" variant="outline" size="lg" className="rounded-2xl" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
