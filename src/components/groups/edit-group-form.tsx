'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Shield, X, UserPlus } from 'lucide-react';
import {
  updateGroup,
  uploadGroupCover,
  addGroupModerator,
  removeGroupModerator,
  searchUsers,
} from '@/lib/actions/groups';
import { toast } from 'sonner';
import type { Group } from '@/types/database';

interface Member {
  user_id: string;
  role: string;
  profiles: { id: string; display_name: string; avatar_url: string | null };
}

interface EditGroupFormProps {
  group: Group;
  members: Member[];
}

export function EditGroupForm({ group, members: initialMembers }: EditGroupFormProps) {
  const t = useTranslations('groups.editGroup');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [coverPreview, setCoverPreview] = useState<string | null>(group.cover_url);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [moderators, setModerators] = useState<Member[]>(
    initialMembers.filter((m) => m.role === 'moderator')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; display_name: string; avatar_url: string | null }[]
  >([]);
  const [searching, setSearching] = useState(false);

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

    try {
      if (coverFile) {
        const formData = new FormData();
        formData.append('cover', coverFile);
        await uploadGroupCover(formData, group.id);
      }

      const result = await updateGroup(group.id, { name, description });

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
      {/* Basic info */}
      <Card>
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
            <Label htmlFor="description">{t('description')}</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

      {/* Moderators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('moderators')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current moderators */}
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

          {/* Search to add */}
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

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
