import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getUser } from '@/lib/actions/auth';
import { getConversations } from '@/lib/actions/messages';
import { ConversationList } from '@/components/messages/conversation-list';

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect({ href: '/login', locale });

  const t = await getTranslations('messages');
  const conversations = await getConversations();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <div className="rounded-lg border">
        <ConversationList
          conversations={conversations}
          currentUserId={user!.id}
        />
      </div>
    </div>
  );
}
