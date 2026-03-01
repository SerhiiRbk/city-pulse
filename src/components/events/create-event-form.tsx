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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, X, ChevronsUpDown, Check } from 'lucide-react';
import { LocationPicker } from '@/components/maps/location-picker';
import { createEvent, uploadEventPhoto } from '@/lib/actions/events';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Interest, InterestCategory } from '@/types/database';

interface CreateEventFormProps {
  interests: Interest[];
  categories: InterestCategory[];
}

export function CreateEventForm({ interests, categories }: CreateEventFormProps) {
  const t = useTranslations('events.create');
  const locale = useLocale();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestsPopoverOpen, setInterestsPopoverOpen] = useState(false);
  const [location, setLocation] = useState<{
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    country?: string;
  }>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const groupedInterests = categories.map((cat) => ({
    ...cat,
    label: getCategoryLabel(cat),
    items: interests.filter((i) => {
      if (i.category_id) return i.category_id === cat.id;
      return cat.id === uncategorizedCatId;
    }),
  })).filter((g) => g.items.length > 0);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || photos.length >= 5) return;

    setUploading(true);
    for (let i = 0; i < files.length && photos.length + i < 5; i++) {
      const formData = new FormData();
      formData.append('photo', files[i]);
      const result = await uploadEventPhoto(formData, 'temp');
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

    const data = {
      title: form.get('title') as string,
      description: form.get('description') as string,
      category_id: primaryCategory,
      starts_at: `${form.get('date')}T${form.get('time')}`,
      duration_minutes: Number(form.get('duration')) || 60,
      is_online: isOnline,
      is_free: isFree,
      price: isFree ? undefined : Number(form.get('price')) || undefined,
      currency: isFree ? undefined : (form.get('currency') as string) || 'EUR',
      max_attendees: form.get('max_attendees') ? Number(form.get('max_attendees')) : undefined,
      is_private: isPrivate,
      country: location.country,
      city: location.city,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      photos,
    };

    if (!data.title || !data.starts_at || !primaryCategory) {
      toast.error('Please fill all required fields');
      setIsLoading(false);
      return;
    }

    const result = await createEvent(data);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    toast.success('Event created!');
    router.push(`/events/${result.event?.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('name')}</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
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
                    {interest.icon && <span className="text-base leading-none">{interest.icon}</span>}
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
                          <Check className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                          {interest.icon && <span className="text-base leading-none">{interest.icon}</span>}
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
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">{t('date')}</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">{t('time')}</Label>
              <Input id="time" name="time" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{t('duration')}</Label>
              <Input id="duration" name="duration" type="number" defaultValue={60} min={15} step={15} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type & Price */}
      <Card>
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
                <Input id="price" name="price" type="number" min={0} step={0.01} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" name="currency" defaultValue="EUR" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="max_attendees">{t('maxAttendees')}</Label>
            <Input id="max_attendees" name="max_attendees" type="number" min={1} placeholder="Unlimited" />
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

      {/* Location */}
      {!isOnline && (
        <Card>
          <CardHeader>
            <CardTitle>{t('location')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-3 text-sm">{t('clickMap')}</p>
            <LocationPicker
              lat={location.lat}
              lng={location.lng}
              address={location.address}
              onLocationChange={setLocation}
            />
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle>{t('photos')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {photos.map((url, i) => (
              <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="border-muted-foreground/30 text-muted-foreground flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed hover:border-solid">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <span className="text-2xl">+</span>
                    <span className="text-xs">{5 - photos.length} left</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
