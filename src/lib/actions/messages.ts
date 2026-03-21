'use server';

import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/actions/notifications';

export async function getConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('conversations_with_details')
    .select('*')
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  return data || [];
}

export async function getUnreadMessagesCount() {
  const conversations = await getConversations();

  return conversations.reduce((sum, conversation) => {
    const unreadCount =
      typeof conversation.unread_count === 'number' ? conversation.unread_count : 0;

    return sum + unreadCount;
  }, 0);
}

export async function getConversation(conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('conversations_with_details')
    .select('*')
    .eq('id', conversationId)
    .single();
  return data;
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('messages')
    .select('*, profiles:sender_id(display_name, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('participant_1, participant_2, status')
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    return { error: 'Conversation not found' };
  }

  if (conversation.status !== 'active') {
    return { error: 'Conversation is not active' };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })
    .select('*, profiles:sender_id(display_name, avatar_url)')
    .single();

  if (error) return { error: error.message };

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  const recipientId =
    conversation.participant_1 === user.id
      ? conversation.participant_2
      : conversation.participant_1;

  await createNotification({
    userId: recipientId,
    type: 'new_message',
    title: 'New message',
    body: content.length > 120 ? `${content.slice(0, 117)}...` : content,
    data: { conversationId },
  });

  return { message: data };
}

export async function requestChat(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (user.id === targetUserId) return { error: 'Cannot chat with yourself' };

  const { data: blocked } = await supabase
    .from('blocked_users')
    .select('blocker_id')
    .eq('blocker_id', targetUserId)
    .eq('blocked_id', user.id)
    .single();

  if (blocked) return { error: 'User has blocked you' };

  const { data: existing } = await supabase
    .from('conversations')
    .select('id, status')
    .or(
      `and(participant_1.eq.${user.id},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${user.id})`,
    )
    .single();

  if (existing) return { conversationId: existing.id };

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({
      participant_1: user.id,
      participant_2: targetUserId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await createNotification({
    userId: targetUserId,
    type: 'chat_request',
    title: 'New chat request',
    body: 'Someone wants to start a conversation with you.',
    data: { conversationId: conv.id },
  });

  return { conversationId: conv.id };
}

export async function approveConversation(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('participant_1, participant_2')
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    return { error: 'Conversation not found' };
  }

  const { error } = await supabase
    .from('conversations')
    .update({ status: 'active' })
    .eq('id', conversationId);
  if (error) return { error: error.message };

  const requesterId =
    conversation.participant_1 === user.id
      ? conversation.participant_2
      : conversation.participant_1;

  await createNotification({
    userId: requesterId,
    type: 'system',
    title: 'Chat approved',
    body: 'Your chat request was approved.',
    data: { conversationId, kind: 'chat_approved' },
  });

  return { success: true };
}

export async function declineConversation(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('participant_1, participant_2, status')
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    return { error: 'Conversation not found' };
  }

  if (conversation.status !== 'pending') {
    return { error: 'Conversation is not pending' };
  }

  if (conversation.participant_2 !== user.id) {
    return { error: 'Only the recipient can decline this request' };
  }

  const { error } = await supabase
    .from('conversations')
    .update({ status: 'declined' })
    .eq('id', conversationId);

  if (error) return { error: error.message };

  await createNotification({
    userId: conversation.participant_1,
    type: 'system',
    title: 'Chat request declined',
    body: 'Your chat request was declined.',
    data: { conversationId, kind: 'chat_declined' },
  });

  return { success: true };
}

export async function markMessagesRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark messages as read', {
      conversationId,
      userId: user.id,
      error: error.message,
    });
  }
}

export async function blockUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: userId });

  await supabase
    .from('conversations')
    .update({ status: 'blocked' })
    .or(
      `and(participant_1.eq.${user.id},participant_2.eq.${userId}),and(participant_1.eq.${userId},participant_2.eq.${user.id})`,
    );

  return { success: true };
}

export async function unblockUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', userId);

  return { success: true };
}
