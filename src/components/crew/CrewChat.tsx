'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCrewMessages,
  sendCrewMessage,
  type CrewMessageWithSender,
} from '@/lib/actions/crew';
import { CREW_MESSAGE_MAX_LENGTH } from '@/lib/constants/crew';

interface CrewChatProps {
  crewId: string;
  isArchived: boolean;
  currentUserId: string;
}

/**
 * Real-time crew group chat component.
 *
 * Features:
 * - Loads initial messages via getCrewMessages server action
 * - Subscribes to new messages via Supabase Realtime (postgres_changes)
 * - Displays messages in a scrollable container (newest at bottom)
 * - System messages styled differently (centered, muted text, no avatar)
 * - User messages show sender avatar, name, and timestamp
 * - Message input disabled when crew is archived
 * - "Load more" button at top for cursor-based pagination
 * - Auto-scroll to bottom on new messages
 *
 * Requirements: 5.1–5.9
 */
export function CrewChat({ crewId, isArchived, currentUserId }: CrewChatProps) {
  const t = useTranslations('crew');
  const locale = useLocale();

  const [messages, setMessages] = useState<CrewMessageWithSender[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    created_at: string;
    id: string;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // Load initial messages
  useEffect(() => {
    let active = true;

    async function loadMessages() {
      setLoading(true);
      const result = await getCrewMessages({ crew_id: crewId, limit: 50 });

      if (!active) return;

      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      // Messages come newest-first from the API, reverse for display (oldest at top)
      const reversed = [...(result.messages || [])].reverse();
      setMessages(reversed);
      setNextCursor(result.nextCursor ?? null);
      setLoading(false);
      isInitialLoad.current = true;
    }

    void loadMessages();

    return () => {
      active = false;
    };
  }, [crewId]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      isInitialLoad.current = false;
    }
  }, [messages]);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`crew-chat:${crewId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_crew_messages',
          filter: `crew_id=eq.${crewId}`,
        },
        async (payload) => {
          const newMsg = payload.new as {
            id: string;
            crew_id: string;
            sender_id: string | null;
            content: string;
            is_system: boolean;
            created_at: string;
          };

          // Avoid duplicates (e.g., from optimistic updates)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // For messages from other users or system messages, we need sender info
            // For our own messages, we already have them from optimistic update
            const messageWithSender: CrewMessageWithSender = {
              id: newMsg.id,
              crew_id: newMsg.crew_id,
              sender_id: newMsg.sender_id,
              content: newMsg.content,
              is_system: newMsg.is_system,
              created_at: newMsg.created_at,
              sender: null, // Will be populated below if needed
            };

            return [...prev, messageWithSender];
          });

          // If the message is from another user, fetch sender info
          if (newMsg.sender_id && newMsg.sender_id !== currentUserId && !newMsg.is_system) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single();

            if (profile) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === newMsg.id
                    ? {
                        ...m,
                        sender: {
                          display_name: profile.display_name,
                          avatar_url: profile.avatar_url,
                        },
                      }
                    : m,
                ),
              );
            }
          }

          // Auto-scroll to bottom on new messages (only within the chat container)
          setTimeout(() => {
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          }, 50);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [crewId, currentUserId]);

  // Load older messages (cursor-based pagination)
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    const result = await getCrewMessages({
      crew_id: crewId,
      cursor: nextCursor.created_at,
      cursor_id: nextCursor.id,
      limit: 50,
    });

    if (result.error) {
      toast.error(result.error);
      setLoadingMore(false);
      return;
    }

    // Older messages come newest-first, reverse and prepend
    const olderMessages = [...(result.messages || [])].reverse();
    setMessages((prev) => [...olderMessages, ...prev]);
    setNextCursor(result.nextCursor ?? null);
    setLoadingMore(false);

    // Maintain scroll position after prepending
    requestAnimationFrame(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - prevScrollHeight;
      }
    });
  }, [crewId, nextCursor, loadingMore]);

  // Send message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || isArchived || sending) return;

    setSending(true);
    setInput('');

    const result = await sendCrewMessage({ crew_id: crewId, content });

    if (result.error) {
      toast.error(result.error);
      setInput(content); // Restore input on error
    }

    setSending(false);
  }

  // Format timestamp
  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {/* Load more button */}
        {nextCursor && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs text-muted-foreground"
            >
              {loadingMore ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <ChevronUp className="mr-1 h-3 w-3" />
              )}
              {t('load_more_messages')}
            </Button>
          </div>
        )}

        {/* Messages list */}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('no_messages_yet')}</p>
          </div>
        )}

        {messages.map((msg) => {
          // System messages: centered, muted, no avatar
          if (msg.is_system) {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                  {msg.content}
                </span>
              </div>
            );
          }

          const isMine = msg.sender_id === currentUserId;

          return (
            <div
              key={msg.id}
              className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}
            >
              {/* Other user's avatar */}
              {!isMine && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={msg.sender?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {msg.sender?.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3 py-2',
                  isMine
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted',
                )}
              >
                {/* Sender name for other users */}
                {!isMine && msg.sender?.display_name && (
                  <p className="mb-0.5 text-[11px] font-medium opacity-70">
                    {msg.sender.display_name}
                  </p>
                )}

                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>

                <p
                  className={cn(
                    'mt-1 text-[10px] opacity-60',
                    isMine ? 'text-right' : '',
                  )}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {isArchived ? (
        <div className="border-t p-3 text-center">
          <p className="text-xs text-muted-foreground">{t('chat_archived')}</p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2 border-t p-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('type_message')}
            className="flex-1"
            disabled={sending}
            maxLength={CREW_MESSAGE_MAX_LENGTH}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
