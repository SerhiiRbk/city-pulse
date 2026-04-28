'use client';

import { useState, useCallback } from 'react';
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
import { LanguageMultiSelect } from '@/components/ui/language-multi-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Shield, X, UserPlus, ChevronsUpDown, Check, MapPin, Link2 } from 'lucide-react';
import { CityPicker } from '@/components/ui/city-picker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useRichEditorLabels } from '@/components/ui/use-rich-editor-labels';
import {
  updateGroup,
  uploadGroupCover,
  addGroupModerator,
  removeGroupModerator,
  searchUsers,
  isSlugAvailable,
} from '@/lib/actions/groups';
import { toast } from 'sonner';
import { COUNTRIES } from '@/lib/constants';
import { cn, countryCodeToFlag, toSlug, isValidSlug } from '@/lib/utils';
import { extractPlainText } from '@/lib/rich-text/extract-plain';
import { plainTextToRichTextDoc } from '@/lib/rich-text/from-plain';
import { richTextHasContent } from '@/lib/rich-text/validate';
import type { RichTextDoc } from '@/lib/rich-text/types';
import type { Group, Interest, InterestCategory, City } from '@/types/database';

/**
 * Loads the editor with whatever the row currently has:
 *   * If the group already has a rich JSON doc, use it as-is so the
 *     edit is lossless;
 *   * otherwise lift the legacy plain text into a minimal valid doc
 *     so the user can keep editing in the new editor.
 */
function loadDescriptionDoc(group: Group): RichTextDoc {
  if (
    group.description_json &&
    typeof group.description_json === 'object' &&
    !Array.isArray(group.description_json)
  ) {
    return group.description_json as unknown as RichTextDoc;
  }
  return plainTextToRichTextDoc(group.description ?? '');
}

interface Member {
  user_id: string;
  role: string;
  profiles: { id: string; display_name: string; avatar_url: string | null };
}

interface EditGroupFormProps {
  group: Group;
  members: Member[];
  interests: Interest[];
  categories: InterestCategory[];
  groupInterestIds: string[];
  initialCity?: City | null;
}

export function EditGroupForm({
  group,
  members: initialMembers,
  interests,
  categories,
  groupInterestIds,
  initialCity,
}: EditGroupFormProps) {
  const t = useTranslations('groups.editGroup');
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(group.name);
  const [slug, setSlug] = useState(group.slug || '');
  const [descriptionDoc, setDescriptionDoc] = useState<RichTextDoc>(() => loadDescriptionDoc(group));
  const editorLabels = useRichEditorLabels();
  const [coverPreview, setCoverPreview] = useState<string | null>(group.cover_url);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [country, setCountry] = useState(group.country || '');
  const [selectedCity, setSelectedCity] = useState<City | null>(initialCity || null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(groupInterestIds);
  const [interestsPopoverOpen, setInterestsPopoverOpen] = useState(false);
  const [languages, setLanguages] = useState<string[]>(group.languages || []);
  const [languagesPopoverOpen, setLanguagesPopoverOpen] = useState(false);

  const [moderators, setModerators] = useState<Member[]>(
    initialMembers.filter((m) => m.role === 'moderator')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; display_name: string; avatar_url: string | null }[]
  >([]);
  const [searching, setSearching] = useState(false);

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

  const handleCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

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

    const effectiveCountry = country && country !== '__none' ? country : null;

    if (normalizedSlug) {
      const available = await isSlugAvailable(normalizedSlug, effectiveCountry, group.id);
      if (!available) {
        toast.error('This slug is already taken. Choose a different one.');
        setIsLoading(false);
        return;
      }
    }

    try {
      if (coverFile) {
        const formData = new FormData();
        formData.append('cover', coverFile);
        await uploadGroupCover(formData, group.id);
      }

      // Rich body wins over plain text. We always forward a plain
      // projection so older clients that read the `description`
      // column see the user's intent, and pass `description_json:
      // null` to clear the JSON column when the doc collapses to
      // empty (legacy plain-text mode).
      const hasRichDescription = richTextHasContent(descriptionDoc);
      const description = hasRichDescription
        ? extractPlainText(descriptionDoc).slice(0, 4000)
        : '';

      const result = await updateGroup(group.id, {
        name,
        slug: normalizedSlug,
        description,
        description_json: hasRichDescription ? descriptionDoc : null,
        languages,
        country: effectiveCountry,
        city: selectedCity?.name || null,
        city_id: selectedCity?.id || null,
        interest_ids: selectedInterests,
      });

      if (result.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success(t('saved'));
      router.push(`/groups/${group.id}`);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(query);
      const existingIds = new Set([
        group.created_by,
        ...moderators.map((m) => m.user_id),
      ]);
      setSearchResults(results.filter((u) => !existingIds.has(u.id)));
    } finally {
      setSearching(false);
    }
  }

  async function handleAddModerator(user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  }) {
    const result = await addGroupModerator(group.id, user.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setModerators((prev) => [
      ...prev,
      {
        user_id: user.id,
        role: 'moderator',
        profiles: { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url },
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
    toast.success(t('moderatorAdded'));
  }

  async function handleRemoveModerator(userId: string) {
    const result = await removeGroupModerator(group.id, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setModerators((prev) => prev.filter((m) => m.user_id !== userId));
    toast.success(t('moderatorRemoved'));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Shape the community</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Clarify the group so the right people recognise themselves in it</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A strong group page explains the vibe, the place, and what kind of people should feel welcome to join.
        </p>
      </div>
      {/* Basic info */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              URL slug
            </Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">
                /groups/{country && country !== '__none' ? country.toLowerCase() : 'global'}/
              </span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(toSlug(e.target.value))}
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
            {slug && isValidSlug(slug) && (
              <p className="text-xs text-muted-foreground">
                Direct link: /groups/{country && country !== '__none' ? country.toLowerCase() : 'global'}/{slug}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <RichTextEditor
              ariaLabel={t('description')}
              value={descriptionDoc}
              onChange={setDescriptionDoc}
              labels={editorLabels}
              maxLength={4000}
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
      <Card className="rounded-3xl border-border/50 shadow-sm">
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
      <Card className="rounded-3xl border-border/50 shadow-sm">
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
              {groupedInterests.map((grp) => (
                <div key={grp.id} className="mb-2 last:mb-0">
                  <p className="text-muted-foreground mb-1 px-2 text-xs font-semibold uppercase tracking-wider">
                    {grp.label}
                  </p>
                  {grp.items.map((interest) => {
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

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>{t('language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageMultiSelect
            value={languages}
            onChange={setLanguages}
            open={languagesPopoverOpen}
            onOpenChange={setLanguagesPopoverOpen}
          />
        </CardContent>
      </Card>

      {/* Moderators */}
      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('moderators')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {moderators.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noModerators')}</p>
          ) : (
            <div className="space-y-2">
              {moderators.map((mod) => (
                <div
                  key={mod.user_id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={mod.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {mod.profiles?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium">
                    {mod.profiles?.display_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {t('moderators').slice(0, -1)}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => handleRemoveModerator(mod.user_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('addModerator')}</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder={t('searchUsers')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAddModerator(user)}
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

      <div className="sticky bottom-3 z-20 rounded-[1.5rem] border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-md">
        <Button type="submit" size="lg" className="w-full rounded-2xl" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
