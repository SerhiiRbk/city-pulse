'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  getContacts,
  getInteractionPool,
  type ContactWithProfile,
  type PoolUser,
} from '@/lib/actions/contacts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PickerUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  source: 'contact' | 'pool';
}

interface ContactsPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 300;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Multiselect picker for user contacts and interaction pool.
 * Loads contacts on mount, searches interaction pool on query input.
 * Displays avatar + display_name for each option.
 * Shows selected users as removable badges at the top.
 *
 * Requirements: 3.9, 10.3, 10.4
 */
export function ContactsPicker({ selectedIds, onChange }: ContactsPickerProps) {
  const t = useTranslations('crew');

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [poolResults, setPoolResults] = useState<PoolUser[]>([]);
  const [query, setQuery] = useState('');
  const [isLoadingContacts, startContactsTransition] = useTransition();
  const [isSearchingPool, startPoolTransition] = useTransition();
  const [focused, setFocused] = useState(false);
  // Cache selected pool users so chips persist when search query changes
  const selectedPoolCacheRef = useRef<Map<string, PoolUser>>(new Map());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Load contacts on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    startContactsTransition(async () => {
      const result = await getContacts();
      if (result.contacts) {
        setContacts(result.contacts);
      }
    });
  }, []);

  // -------------------------------------------------------------------------
  // Debounced search of interaction pool
  // -------------------------------------------------------------------------
  const searchPool = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setPoolResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startPoolTransition(async () => {
        const result = await getInteractionPool({ search: searchQuery.trim() });
        if (result.users) {
          setPoolResults(result.users);
        }
      });
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Handle query change
  // -------------------------------------------------------------------------
  function handleQueryChange(value: string) {
    setQuery(value);
    searchPool(value);
  }

  // -------------------------------------------------------------------------
  // Build unified user list (contacts first, then pool results not in contacts)
  // -------------------------------------------------------------------------
  const contactIds = new Set(contacts.map((c) => c.contact_id));

  const filteredContacts: PickerUser[] = contacts
    .filter((c) => {
      if (!query.trim()) return true;
      return c.display_name.toLowerCase().includes(query.trim().toLowerCase());
    })
    .map((c) => ({
      id: c.contact_id,
      display_name: c.display_name,
      avatar_url: c.avatar_url,
      source: 'contact' as const,
    }));

  const filteredPool: PickerUser[] = poolResults
    .filter((u) => !contactIds.has(u.id)) // Exclude users already in contacts
    .map((u) => ({
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      source: 'pool' as const,
    }));

  const allUsers = [...filteredContacts, ...filteredPool];

  // -------------------------------------------------------------------------
  // Cache pool users when they appear in results
  // -------------------------------------------------------------------------
  useEffect(() => {
    for (const user of poolResults) {
      selectedPoolCacheRef.current.set(user.id, user);
    }
  }, [poolResults]);

  // -------------------------------------------------------------------------
  // Selected users for chip display
  // -------------------------------------------------------------------------
  const selectedUsers: PickerUser[] = selectedIds
    .map((id) => {
      const contact = contacts.find((c) => c.contact_id === id);
      if (contact) {
        return {
          id: contact.contact_id,
          display_name: contact.display_name,
          avatar_url: contact.avatar_url,
          source: 'contact' as const,
        };
      }
      // Check current pool results first, then cache
      const poolUser =
        poolResults.find((u) => u.id === id) ??
        selectedPoolCacheRef.current.get(id);
      if (poolUser) {
        return {
          id: poolUser.id,
          display_name: poolUser.display_name,
          avatar_url: poolUser.avatar_url,
          source: 'pool' as const,
        };
      }
      return null;
    })
    .filter(Boolean) as PickerUser[];

  // -------------------------------------------------------------------------
  // Selection handlers
  // -------------------------------------------------------------------------
  function toggleUser(userId: string) {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  }

  function removeUser(userId: string) {
    onChange(selectedIds.filter((id) => id !== userId));
  }

  // -------------------------------------------------------------------------
  // Click outside to close dropdown
  // -------------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const showDropdown = focused && (allUsers.length > 0 || isLoadingContacts || isSearchingPool);

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Selected users as chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="gap-1.5 py-1 pl-1 pr-2"
            >
              <Avatar size="sm">
                {user.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={user.display_name} />
                )}
                <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate text-xs">
                {user.display_name}
              </span>
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                className="text-muted-foreground hover:text-foreground -mr-0.5 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${user.display_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={t('search_contacts')}
          className="pl-8"
        />
      </div>

      {/* Dropdown list */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {isLoadingContacts && allUsers.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Loading...
                </p>
              )}

              {/* Contact section */}
              {filteredContacts.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {t('contacts')}
                  </p>
                  {filteredContacts.map((user) => (
                    <UserOption
                      key={user.id}
                      user={user}
                      selected={selectedIds.includes(user.id)}
                      onToggle={() => toggleUser(user.id)}
                    />
                  ))}
                </>
              )}

              {/* Pool section (only when searching) */}
              {filteredPool.length > 0 && (
                <>
                  {filteredContacts.length > 0 && (
                    <div className="my-1 border-t border-border" />
                  )}
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Interaction pool
                  </p>
                  {filteredPool.map((user) => (
                    <UserOption
                      key={user.id}
                      user={user}
                      selected={selectedIds.includes(user.id)}
                      onToggle={() => toggleUser(user.id)}
                    />
                  ))}
                </>
              )}

              {/* Searching indicator */}
              {isSearchingPool && query.trim() && (
                <p className="px-2 py-2 text-center text-xs text-muted-foreground">
                  Searching...
                </p>
              )}

              {/* No results */}
              {!isLoadingContacts &&
                !isSearchingPool &&
                allUsers.length === 0 &&
                query.trim() && (
                  <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                    {t('no_contacts')}
                  </p>
                )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UserOption sub-component
// ---------------------------------------------------------------------------

function UserOption({
  user,
  selected,
  onToggle,
}: {
  user: PickerUser;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors',
        selected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50',
      )}
    >
      <Avatar size="sm">
        {user.avatar_url && (
          <AvatarImage src={user.avatar_url} alt={user.display_name} />
        )}
        <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-left">
        {user.display_name}
      </span>
      {selected && (
        <span className="text-primary text-xs font-medium">✓</span>
      )}
    </button>
  );
}
