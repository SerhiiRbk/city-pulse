'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Check, Shield } from 'lucide-react';
import {
  sendMessage,
  approveConversation,
  declineConversation,
  getConversation,
  getMessages,
  markMessagesRead,
} from '@/lib/actions/messages';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface ChatViewProps {
  conversationId: string;
  messages: Message[];
  currentUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  status: string;
  isRecipient: boolean;
}

export function ChatView({
  conversationId,
  messages: initialMessages,
  currentUserId,
  otherUserName,
  otherUserAvatar,
  status,
  isRecipient,
}: ChatViewProps) {
  const t = useTranslations('messages');
  const locale = useLocale();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approve' | 'decline' | null>(null);
  const [convStatus, setConvStatus] = useState(status);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setConvStatus(status);
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    markMessagesRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    let active = true;

    const refreshConversation = async () => {
      const [nextMessages, nextConversation] = await Promise.all([
        getMessages(conversationId),
        getConversation(conversationId),
      ]);

      if (!active) return;

      setMessages(nextMessages as Message[]);

      if (nextConversation?.status) {
        setConvStatus(nextConversation.status);
      }

      void markMessagesRead(conversationId);
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshConversation();
      }
    }, 2500);

    const handleFocus = () => {
      void refreshConversation();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();

    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as {
            id: string;
            sender_id: string;
            content: string;
            created_at: string;
            is_read: boolean;
          };

          setMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) return prev;

            const nextMessage: Message = {
              ...message,
              profiles: {
                display_name: otherUserName,
                avatar_url: otherUserAvatar,
              },
            };

            return [...prev, nextMessage];
          });

          if (message.sender_id !== currentUserId) {
            void markMessagesRead(conversationId);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            is_read: boolean;
          };

          setMessages((prev) =>
            prev.map((item) =>
              item.id === updated.id ? { ...item, is_read: updated.is_read } : item,
            ),
          );
        },
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel(`conversations:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };
          if (updated.status) {
            setConvStatus(updated.status);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(conversationsChannel);
    };
  }, [conversationId, currentUserId, otherUserAvatar, otherUserName]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || convStatus !== 'active') return;

    setSending(true);
    const result = await sendMessage(conversationId, input.trim());
    if (result.error) {
      toast.error(result.error);
    } else if (result.message) {
      setMessages((prev) =>
        prev.some((item) => item.id === result.message!.id)
          ? prev
          : [...prev, result.message!],
      );
      setInput('');
    }
    setSending(false);
  }

  async function handleApprove() {
    setPendingAction('approve');
    const result = await approveConversation(conversationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setConvStatus('active');
      toast.success(t('chatApprovedToast'));
    }
    setPendingAction(null);
  }

  async function handleDecline() {
    setPendingAction('decline');
    const result = await declineConversation(conversationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setConvStatus('declined');
      toast.success(t('chatDeclinedToast'));
    }
    setPendingAction(null);
  }

  if (convStatus === 'blocked' || convStatus === 'declined') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          {convStatus === 'declined' ? t('chatDeclined') : t('blocked')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src={otherUserAvatar || undefined} />
          <AvatarFallback>{otherUserName[0]}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{otherUserName}</span>
      </div>

      {/* Pending banner */}
      {convStatus === 'pending' && (
        <div className="flex items-center gap-3 border-b bg-yellow-50 p-3 dark:bg-yellow-950/20">
          <Shield className="h-5 w-5 text-yellow-600" />
          <p className="flex-1 text-sm">{t('chatRequested')}</p>
          {isRecipient && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApprove} disabled={pendingAction !== null}>
                {t('approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                disabled={pendingAction !== null}
              >
                {t('decline')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2',
                  isMine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                <p className="text-sm">{msg.content}</p>
                <div className={cn('mt-1 flex items-center gap-1 text-[10px] opacity-60', isMine ? 'justify-end' : '')}>
                  {new Date(msg.created_at).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isMine && msg.is_read && <Check className="h-3 w-3" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {convStatus === 'active' && (
        <form onSubmit={handleSend} className="flex gap-2 border-t p-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('typeMessage')}
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
