import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import { getConversation, getMessages, getConversations } from '@/lib/actions/messages';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatView } from '@/components/messages/chat-view';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect({ href: '/login', locale });

  const [conversation, messages, conversations] = await Promise.all([
    getConversation(id),
    getMessages(id),
    getConversations(),
  ]);

  if (!conversation) notFound();

  const t = await getTranslations('messages');

  const isP1 = conversation.participant_1 === user!.id;
  const otherName = isP1 ? conversation.p2_name : conversation.p1_name;
  const otherAvatar = isP1 ? conversation.p2_avatar : conversation.p1_avatar;
  const isRecipient = conversation.participant_2 === user!.id;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-3">
        <div className="hidden overflow-y-auto border-r md:block">
          <ConversationList
            conversations={conversations}
            currentUserId={user!.id}
            activeConversationId={id}
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <ChatView
            conversationId={id}
            messages={messages}
            currentUserId={user!.id}
            otherUserName={otherName}
            otherUserAvatar={otherAvatar}
            status={conversation.status}
            isRecipient={isRecipient}
          />
        </div>
      </div>
    </div>
  );
}
