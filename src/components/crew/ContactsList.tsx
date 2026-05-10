'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import {
  getContacts,
  getInteractionPool,
  addContact,
  removeContact,
  type ContactWithProfile,
  type PoolUser,
} from '@/lib/actions/contacts';

/**
 * Full contacts management component for the profile contacts page.
 *
 * Features:
 * - Displays user's contacts with avatar, name, and remove button
 * - Client-side search/filter on display_name
 * - "Add from interaction pool" section with search and add button
 *
 * Requirements: 10.1, 10.2
 */
export function ContactsList() {
  const t = useTranslations('crew');

  // Contacts state
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Interaction pool state
  const [poolSearch, setPoolSearch] = useState('');
  const [poolUsers, setPoolUsers] = useState<PoolUser[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);

  // Action states
  const [isPending, startTransition] = useTransition();
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setContactsLoading(true);
    const result = await getContacts();
    if (result.contacts) {
      setContacts(result.contacts);
    }
    setContactsLoading(false);
  }

  // Filter contacts client-side
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter((c) =>
      c.display_name.toLowerCase().includes(query),
    );
  }, [contacts, searchQuery]);

  // Search interaction pool with debounce
  useEffect(() => {
    if (!poolSearch.trim()) {
      setPoolUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setPoolLoading(true);
      const result = await getInteractionPool({ search: poolSearch.trim() });
      if (result.users) {
        // Exclude users already in contacts
        const contactIds = new Set(contacts.map((c) => c.contact_id));
        setPoolUsers(result.users.filter((u) => !contactIds.has(u.id)));
      }
      setPoolLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [poolSearch, contacts]);

  function handleRemoveContact(contactId: string) {
    setActionUserId(contactId);
    startTransition(async () => {
      const result = await removeContact({ contact_id: contactId });
      if (result.success) {
        setContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
      }
      setActionUserId(null);
    });
  }

  function handleAddContact(userId: string) {
    setActionUserId(userId);
    startTransition(async () => {
      const result = await addContact({ contact_id: userId });
      if (result.success) {
        // Remove from pool results
        setPoolUsers((prev) => prev.filter((u) => u.id !== userId));
        // Reload contacts to get fresh data from server
        await loadContacts();
      }
      setActionUserId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Contacts search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('search_contacts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contacts list */}
      <div className="space-y-1">
        {contactsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {searchQuery ? t('search_contacts') : t('no_contacts')}
          </p>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.contact_id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <Link
                href={`/profile/${contact.contact_id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={contact.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {contact.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {contact.display_name}
                </span>
              </Link>

              {actionUserId === contact.contact_id && isPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveContact(contact.contact_id)}
                  aria-label={t('remove_contact')}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add from interaction pool */}
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('add_contact')}
        </h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search_contacts')}
            value={poolSearch}
            onChange={(e) => setPoolSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-1">
          {poolLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : poolUsers.length > 0 ? (
            poolUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {user.display_name}
                </span>

                {actionUserId === user.id && isPending ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-primary hover:text-primary"
                    onClick={() => handleAddContact(user.id)}
                    aria-label={t('add_contact')}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          ) : poolSearch.trim() ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {t('no_contacts')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
