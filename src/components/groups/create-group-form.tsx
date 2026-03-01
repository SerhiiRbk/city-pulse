'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { createGroup, uploadGroupCover } from '@/lib/actions/groups';
import { toast } from 'sonner';

export function CreateGroupForm() {
  const t = useTranslations('groups.createGroup');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

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

    const result = await createGroup({ name, description });

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
            <Input id="name" name="name" required maxLength={120} />
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

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
