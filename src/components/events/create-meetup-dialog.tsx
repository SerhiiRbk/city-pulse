'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createMeetupForSystemEvent } from '@/lib/actions/meetups';

interface CreateMeetupDialogProps {
  parentEvent: {
    id: string;
    title: string;
    starts_at: string;
    city?: string | null;
    address?: string | null;
  };
  /** Children render the trigger element; defaults to a primary CTA button. */
  children?: React.ReactNode;
}

/**
 * "Идём вместе" composer. Opens a focused modal — most fields (date, place,
 * category) are inherited from the parent system event so we only ask the
 * inviter to fill the truly social bits: a name for their group, a short
 * pitch, an optional cap, an optional alternative meeting point, and a
 * private toggle for friends-only invites.
 */
export function CreateMeetupDialog({ parentEvent, children }: CreateMeetupDialogProps) {
  const t = useTranslations('events.meetup');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(t('defaultTitle', { event: parentEvent.title }));
  const [description, setDescription] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [maxAttendees, setMaxAttendees] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const cap = maxAttendees ? Number(maxAttendees) : null;
    const result = await createMeetupForSystemEvent({
      parent_system_event_id: parentEvent.id,
      title: title.trim(),
      description: description.trim(),
      meeting_point: meetingPoint.trim() || null,
      max_attendees: cap && Number.isFinite(cap) ? cap : null,
      is_private: isPrivate,
    });

    setSubmitting(false);

    if (result.error) {
      toast.error(t('createError'));
      return;
    }
    if ('event' in result && result.event?.id) {
      toast.success(t('createSuccess'));
      setOpen(false);
      router.push(`/events/${result.event.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="lg" className="rounded-xl">
            <Users className="mr-2 h-4 w-4" />
            {t('cta')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {t('dialogDescription', { event: parentEvent.title })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="meetup-title">
                {t('fieldTitle')}
              </label>
              <Input
                id="meetup-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                minLength={3}
                placeholder={t('fieldTitlePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('fieldTitleHint')}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="meetup-description">
                {t('fieldPitch')}
              </label>
              <Textarea
                id="meetup-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t('fieldPitchPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="meetup-meeting-point">
                  {t('fieldMeetingPoint')}
                </label>
                <Input
                  id="meetup-meeting-point"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  maxLength={300}
                  placeholder={t('fieldMeetingPointPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="meetup-cap">
                  {t('fieldCap')}
                </label>
                <Input
                  id="meetup-cap"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={500}
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  placeholder={t('fieldCapPlaceholder')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
              <div className="flex items-start gap-2 pr-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('fieldPrivate')}</p>
                  <p className="text-xs text-muted-foreground">{t('fieldPrivateHint')}</p>
                </div>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
