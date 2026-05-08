'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Globe, Lock, Users } from 'lucide-react';
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
import { LanguageMultiSelect } from '@/components/ui/language-multi-select';
import { ContactsPicker } from '@/components/crew/ContactsPicker';
import { createCrew, sendCrewInvitation } from '@/lib/actions/crew';
import {
  CREW_NAME_MIN_LENGTH,
  CREW_NAME_MAX_LENGTH,
  CREW_DESCRIPTION_MAX_LENGTH,
  CREW_CAPACITY_MIN,
  CREW_CAPACITY_MAX,
} from '@/lib/constants/crew';

export interface CrewCreateDialogProps {
  eventId: string;
  eventTitle: string;
  /** Controlled open state. If omitted, the dialog manages its own state. */
  open?: boolean;
  /** Controlled open state handler. If omitted, the dialog manages its own state. */
  onOpenChange?: (open: boolean) => void;
  /** Optional trigger element. If omitted, a default "Create a Crew" button is rendered. */
  children?: React.ReactNode;
}

export function CrewCreateDialog({
  eventId,
  eventTitle,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: CrewCreateDialogProps) {
  const t = useTranslations('crew');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Support both controlled and uncontrolled open state
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled
    ? controlledOnOpenChange!
    : setInternalOpen;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(6);
  const [languages, setLanguages] = useState<string[]>([]);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  function resetForm() {
    setName('');
    setDescription('');
    setCapacity(6);
    setLanguages([]);
    setIsPublic(false);
    setSelectedContacts([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const crewName = name.trim() || undefined;

    const result = await createCrew({
      event_id: eventId,
      name: crewName,
      description: description.trim() || undefined,
      capacity,
      languages,
      visibility: isPublic ? 'public' : 'private',
    });

    if (result.error) {
      toast.error(t('create_error'));
      setSubmitting(false);
      return;
    }

    if (result.crew) {
      // Send invitations to selected contacts
      if (selectedContacts.length > 0) {
        await Promise.allSettled(
          selectedContacts.map((contactId) =>
            sendCrewInvitation({
              crew_id: result.crew!.id,
              invitee_id: contactId,
            }),
          ),
        );
      }

      toast.success(t('create_success'));
      resetForm();
      onOpenChange(false);
      router.push(`/events/${eventId}/crew/${result.crew.id}`);
    }

    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Render trigger: custom children or default button */}
      <DialogTrigger asChild>
        {children ?? (
          <Button size="lg" className="rounded-xl">
            <Users className="mr-2 h-4 w-4" />
            {t('create_crew_button')}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{t('create_dialog_title')}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {t('create_dialog_description', { eventTitle })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="crew-name">
                {t('field_name')}
              </label>
              <Input
                id="crew-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={CREW_NAME_MIN_LENGTH}
                maxLength={CREW_NAME_MAX_LENGTH}
                placeholder={t('field_name_placeholder', { eventTitle })}
              />
              <p className="text-xs text-muted-foreground">
                {t('field_name_hint')}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="crew-description">
                {t('field_description')}
              </label>
              <Textarea
                id="crew-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={CREW_DESCRIPTION_MAX_LENGTH}
                placeholder={t('field_description_placeholder')}
              />
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="crew-capacity">
                {t('field_capacity')}
              </label>
              <Input
                id="crew-capacity"
                type="number"
                inputMode="numeric"
                min={CREW_CAPACITY_MIN}
                max={CREW_CAPACITY_MAX}
                value={capacity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= CREW_CAPACITY_MIN && val <= CREW_CAPACITY_MAX) {
                    setCapacity(val);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t('field_capacity_hint')}
              </p>
            </div>

            {/* Languages */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t('field_languages')}
              </label>
              <LanguageMultiSelect
                value={languages}
                onChange={setLanguages}
                open={languagesOpen}
                onOpenChange={setLanguagesOpen}
                label={t('field_languages')}
              />
              <p className="text-xs text-muted-foreground">
                {t('field_languages_hint')}
              </p>
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
              <div className="flex items-start gap-2 pr-4">
                {isPublic ? (
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t('field_visibility')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('field_visibility_hint')}
                  </p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {/* Contacts picker for initial invitations */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t('field_invite_contacts')}
              </label>
              <ContactsPicker
                selectedIds={selectedContacts}
                onChange={setSelectedContacts}
              />
              <p className="text-xs text-muted-foreground">
                {t('field_invite_contacts_hint')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('submit_create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
