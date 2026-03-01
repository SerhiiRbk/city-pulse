'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Check, Shield } from 'lucide-react';
import { sendMessage, approveConversation, markMessagesRead } from '@/lib/actions/messages';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [convStatus, setConvStatus] = useState(status);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    markMessagesRead(conversationId);
  }, [conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || convStatus !== 'active') return;

    setSending(true);
    const result = await sendMessage(conversationId, input.trim());
    if (result.error) {
      toast.error(result.error);
    } else if (result.message) {
      setMessages((prev) => [...prev, result.message!]);
      setInput('');
    }
    setSending(false);
  }

  async function handleApprove() {
    const result = await approveConversation(conversationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setConvStatus('active');
      toast.success('Chat approved');
    }
  }

  if (convStatus === 'blocked') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t('blocked')}</p>
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
              <Button size="sm" onClick={handleApprove}>{t('approve')}</Button>
              <Button size="sm" variant="outline">{t('decline')}</Button>
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
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
