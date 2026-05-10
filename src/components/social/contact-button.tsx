'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { addContact, removeContact } from '@/lib/actions/contacts';

interface ContactButtonProps {
  targetUserId: string;
  isInPool: boolean;
  isContact: boolean;
}

export function ContactButton({ targetUserId, isInPool, isContact: initial }: ContactButtonProps) {
  const t = useTranslations('crew');
  const [contact, setContact] = useState(initial);
  const [loading, setLoading] = useState(false);

  // If not in pool, render nothing (hidden per requirement 2.3)
  if (!isInPool) return null;

  async function handleToggle() {
    setLoading(true);
    // Optimistic update
    const previousState = contact;
    setContact(!contact);

    const result = contact
      ? await removeContact({ contact_id: targetUserId })
      : await addContact({ contact_id: targetUserId });

    if (result.error) {
      // Revert on error
      setContact(previousState);
    }
    setLoading(false);
  }

  return (
    <Button
      variant={contact ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : contact ? (
        <UserMinus className="mr-1 h-4 w-4" />
      ) : (
        <UserPlus className="mr-1 h-4 w-4" />
      )}
      {contact ? t('remove_contact') : t('add_contact')}
    </Button>
  );
}
