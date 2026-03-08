'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, X, ChevronsUpDown, Check, MapPin, Link2 } from 'lucide-react';
import { CityPicker } from '@/components/ui/city-picker';
import { createGroup, uploadGroupCover, isSlugAvailable } from '@/lib/actions/groups';
import { toast } from 'sonner';
import { COUNTRIES } from '@/lib/constants';
import { cn, countryCodeToFlag, toSlug, isValidSlug } from '@/lib/utils';
import type { Interest, InterestCategory, City } from '@/types/database';

interface CreateGroupFormProps {
  interests: Interest[];
  categories: InterestCategory[];
}

export function CreateGroupForm({ interests, categories }: CreateGroupFormProps) {
  const t = useTranslations('groups.createGroup');
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [country, setCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestsPopoverOpen, setInterestsPopoverOpen] = useState(false);

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

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const description = form.get('description') as string;

    if (!name.trim()) {
      toast.error('Name is required');
      setIsLoading(false);
      return;
    }

    const normalizedSlug = slug ? slug.toLowerCase() : null;
    if (normalizedSlug && !isValidSlug(normalizedSlug)) {
      toast.error('Invalid slug format');
      setIsLoading(false);
      return;
    }

    if (normalizedSlug) {
      const available = await isSlugAvailable(normalizedSlug, country || null);
      if (!available) {
        toast.error('This slug is already taken. Choose a different one.');
        setIsLoading(false);
        return;
      }
    }

    const result = await createGroup({
      name,
      slug: normalizedSlug,
      description,
      country: country || null,
      city: selectedCity?.name || null,
      city_id: selectedCity?.id || null,
      interest_ids: selectedInterests,
    });

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    if (coverFile && result.group) {
      const formData = new FormData();
      formData.append('cover', coverFile);
      await uploadGroupCover(formData, result.group.id);
    }

    toast.success('Group created!');
    router.push(`/groups/${result.group?.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              onChange={(e) => {
                if (!slugTouched) {
                  setSlug(toSlug(e.target.value));
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              URL slug
            </Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">
                /groups/{country ? country.toLowerCase() : 'global'}/
              </span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(toSlug(e.target.value));
                }}
                placeholder="my-awesome-group"
                maxLength={80}
                className="font-mono text-sm"
              />
            </div>
            {slug && !isValidSlug(slug) && (
              <p className="text-xs text-destructive">
                Slug must be 2-80 characters, lowercase letters, numbers, and hyphens only.
              </p>
            )}
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
            <Label>{t('cover')}</Label>
            {coverPreview && (
              <div className="relative h-40 overflow-hidden rounded-lg border">
                <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverPreview(null);
                    setCoverFile(null);
                  }}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ×
                </button>
              </div>
            )}
            {!coverPreview && (
              <label className="border-muted-foreground/30 text-muted-foreground flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed hover:border-solid">
                <span className="text-2xl">+</span>
                <span className="text-sm">{t('cover')}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('country')} / {t('city')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('country')}</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('country')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {countryCodeToFlag(c.code)} {c[locale as keyof typeof c] || c.en}
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
              countryFilter={country && country !== '__none' ? country : undefined}
              placeholder={t('cityPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle>{t('interests')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
          </div>
          <Popover open={interestsPopoverOpen} onOpenChange={setInterestsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className="w-full justify-between">
                {selectedInterests.length > 0
                  ? `${selectedInterests.length} selected`
                  : t('interests')}
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

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
