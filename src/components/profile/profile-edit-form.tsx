'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Camera, X, ChevronsUpDown, Check, Search, Trash2, Star, Plus, ImagePlus } from 'lucide-react';
import { CityPicker } from '@/components/ui/city-picker';
import { updateProfile, updateAvatar } from '@/lib/actions/profile';
import { uploadUserPhoto, deleteUserPhoto, setPhotoAsAvatar, type UserPhoto } from '@/lib/actions/user-photos';
import { toast } from 'sonner';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { cn, countryCodeToFlag } from '@/lib/utils';
import type { Profile, Interest, InterestCategory, City } from '@/types/database';

const SOCIAL_NETWORKS = [
  { key: 'facebook',  icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, placeholder: 'https://facebook.com/yourprofile' },
  { key: 'instagram', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, placeholder: 'https://instagram.com/yourprofile' },
  { key: 'telegram',  icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>, placeholder: 'https://t.me/yourusername' },
  { key: 'whatsapp',  icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>, placeholder: 'https://wa.me/1234567890' },
  { key: 'twitch',    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>, placeholder: 'https://twitch.tv/yourchannel' },
  { key: 'youtube',   icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, placeholder: 'https://youtube.com/@yourchannel' },
] as const;

interface ProfileEditFormProps {
  profile: Profile;
  interests: Interest[];
  categories: InterestCategory[];
  initialPhotos: UserPhoto[];
  initialCity?: City | null;
}

export function ProfileEditForm({ profile, interests, categories, initialPhotos, initialCity }: ProfileEditFormProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [photos, setPhotos] = useState<UserPhoto[]>(initialPhotos);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.interests);
  const [languages, setLanguages] = useState<string[]>(profile.languages);
  const [selectedCountry, setSelectedCountry] = useState(profile.country || '');
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity || null);
  const [langPopoverOpen, setLangPopoverOpen] = useState(false);
  const [interestsPopoverOpen, setInterestsPopoverOpen] = useState(false);

  const initials = profile.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function getInterestLabel(interest: Interest): string {
    return interest.translations[locale] || interest.translations['en'] || interest.slug;
  }

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((i) => i !== slug) : [...prev, slug],
    );
  }

  function toggleLanguage(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  }

  function getCountryLabel(code: string): string {
    const country = COUNTRIES.find((c) => c.code === code);
    if (!country) return code;
    return country[locale as keyof typeof country] || country.en;
  }

  function getLanguageLabel(code: string): string {
    const lang = LANGUAGES.find((l) => l.code === code);
    if (!lang) return code;
    return lang[locale as keyof typeof lang] || lang.en;
  }

  function getCategoryLabel(cat: InterestCategory): string {
    return cat.translations[locale] || cat.translations['en'] || cat.slug;
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    const result = await updateAvatar(formData);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      setAvatarUrl(result.url);
      toast.success(t('photos.avatarSet'));
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    for (const file of Array.from(files)) {
      if (photos.length >= 5) {
        toast.error(t('photos.maxReached'));
        break;
      }
      const fd = new FormData();
      fd.append('photo', file);
      const result = await uploadUserPhoto(fd);
      if (result.error) {
        toast.error(result.error);
      } else if (result.photo) {
        setPhotos((prev) => [...prev, result.photo!]);
        if (!avatarUrl) {
          const avatarResult = await setPhotoAsAvatar(result.photo.id);
          if (avatarResult.success && avatarResult.url) setAvatarUrl(avatarResult.url);
        }
        toast.success(t('photos.uploaded'));
      }
    }
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function handleDeletePhoto(photo: UserPhoto) {
    const result = await deleteUserPhoto(photo.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (avatarUrl === photo.url) setAvatarUrl('');
      toast.success(t('photos.deleted'));
    }
  }

  async function handleSetAvatar(photo: UserPhoto) {
    const result = await setPhotoAsAvatar(photo.id);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      setAvatarUrl(result.url);
      toast.success(t('photos.avatarSet'));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    const updates = {
      display_name: formData.get('display_name') as string,
      age: formData.get('age') ? Number(formData.get('age')) : null,
      hide_age: formData.get('hide_age') === 'on',
      city: selectedCity?.name || null,
      city_id: selectedCity?.id || null,
      country: selectedCountry || null,
      bio: (formData.get('bio') as string) || null,
      is_available: formData.get('is_available') === 'on',
      is_private: formData.get('is_private') === 'on',
      hide_events: formData.get('hide_events') === 'on',
      languages,
      interests: selectedInterests,
      social_links: {
        facebook: (formData.get('facebook') as string) || undefined,
        instagram: (formData.get('instagram') as string) || undefined,
        telegram: (formData.get('telegram') as string) || undefined,
        whatsapp: (formData.get('whatsapp') as string) || undefined,
        twitch: (formData.get('twitch') as string) || undefined,
        youtube: (formData.get('youtube') as string) || undefined,
      },
    };

    const result = await updateProfile(updates);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('saved'));
      router.push(`/profile/${profile.id}`);
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('photos.title')}</span>
            <span className="text-muted-foreground text-sm font-normal">{photos.length}/5</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((photo) => {
              const isAvatar = avatarUrl === photo.url;
              return (
                <div
                  key={photo.id}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl border-2 transition-all',
                    isAvatar ? 'border-primary ring-2 ring-primary/20' : 'border-border/50 hover:border-border',
                  )}
                >
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  {isAvatar && (
                    <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                      <Star className="h-3 w-3" />
                      Avatar
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isAvatar && (
                      <button
                        type="button"
                        onClick={() => handleSetAvatar(photo)}
                        className="rounded-full bg-white/90 p-1.5 text-xs text-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
                        title={t('photos.setAsAvatar')}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo)}
                      className="rounded-full bg-white/90 p-1.5 text-xs text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      title={t('photos.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <ImagePlus className="h-6 w-6" />
                )}
                <span className="text-[11px] font-medium">{t('photos.add')}</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <p className="text-muted-foreground mt-3 text-xs">
            {t('photos.hint')}
          </p>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">{t('edit')}</Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={profile.display_name}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">{t('age')}</Label>
              <Input
                id="age"
                name="age"
                type="number"
                min={13}
                max={120}
                defaultValue={profile.age || ''}
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Switch id="hide_age" name="hide_age" defaultChecked={profile.hide_age} />
              <Label htmlFor="hide_age">{t('hideAge')}</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t('bio')}</Label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio || ''}
              maxLength={500}
              rows={4}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>{t('locationSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('country')}</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectCountry')} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span className="text-base leading-none">{countryCodeToFlag(c.code)}</span>
                      {c[locale as keyof typeof c] || c.en}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('city')}</Label>
            <CityPicker
              value={selectedCity}
              onChange={setSelectedCity}
              countryFilter={selectedCountry || undefined}
              placeholder={t('cityPlaceholder')}
            />
            <p className="text-muted-foreground text-xs">{t('cityHint')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle>{t('languages')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {languages.map((code) => {
              const lang = LANGUAGES.find((l) => l.code === code);
              return (
                <span
                  key={code}
                  className="bg-background inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm"
                >
                  {lang && <span className="text-base leading-none">{countryCodeToFlag(lang.flag)}</span>}
                  {getLanguageLabel(code)}
                  <button
                    type="button"
                    onClick={() => toggleLanguage(code)}
                    className="text-muted-foreground hover:text-foreground -mr-1 ml-0.5 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
            {languages.length === 0 && (
              <span className="text-muted-foreground text-sm">{t('noLanguagesSelected')}</span>
            )}
          </div>
          <Popover open={langPopoverOpen} onOpenChange={setLangPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className="w-full justify-between">
                {t('addLanguage')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-64 w-[--radix-popover-trigger-width] overflow-y-auto p-1" align="start">
              {LANGUAGES.map((lang) => {
                const selected = languages.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    className={cn(
                      'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                      selected && 'bg-accent',
                    )}
                    onClick={() => toggleLanguage(lang.code)}
                  >
                    <Check className={cn('h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="text-base leading-none">{countryCodeToFlag(lang.flag)}</span>
                    {lang[locale as keyof typeof lang] || lang.en}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle>{t('interests')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedInterests.map((slug) => {
              const interest = interests.find((i) => i.slug === slug);
              return (
                <span
                  key={slug}
                  className="bg-background inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm"
                >
                  {interest?.icon && <span className="text-base leading-none">{interest.icon}</span>}
                  {interest ? getInterestLabel(interest) : slug}
                  <button
                    type="button"
                    onClick={() => toggleInterest(slug)}
                    className="text-muted-foreground hover:text-foreground -mr-1 ml-0.5 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
            {selectedInterests.length === 0 && (
              <span className="text-muted-foreground text-sm">{t('noInterestsSelected')}</span>
            )}
          </div>
          <Popover open={interestsPopoverOpen} onOpenChange={setInterestsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className="w-full justify-between">
                {selectedInterests.length > 0
                  ? t('selectedCount', { count: selectedInterests.length })
                  : t('selectInterests')}
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
                    const selected = selectedInterests.includes(interest.slug);
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        className={cn(
                          'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                          selected && 'bg-accent',
                        )}
                        onClick={() => toggleInterest(interest.slug)}
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
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>{t('socialLinks')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SOCIAL_NETWORKS.map(({ key, icon, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-muted-foreground flex w-10 shrink-0 items-center justify-center text-xl leading-none">
                {icon}
              </span>
              <Input
                id={key}
                name={key}
                defaultValue={
                  (profile.social_links as Record<string, string | undefined>)?.[key] || ''
                }
                placeholder={placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>{t('privacySection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="is_available">{t('available')}</Label>
            <Switch id="is_available" name="is_available" defaultChecked={profile.is_available} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="is_private">{t('privateProfile')}</Label>
            <Switch id="is_private" name="is_private" defaultChecked={profile.is_private} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="hide_events">{t('hideEvents')}</Label>
            <Switch id="hide_events" name="hide_events" defaultChecked={profile.hide_events} />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tCommon('save')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
}
