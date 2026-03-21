'use server';

import { createClient } from '@/lib/supabase/server';

export async function cancelEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, status')
    .eq('id', eventId)
    .single();

  if (!event) return { error: 'Event not found' };
  if (event.organizer_id !== user.id) return { error: 'Not the organizer' };
  if (event.status !== 'published') return { error: 'Cannot cancel this event' };

  const { error } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function completeEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, status')
    .eq('id', eventId)
    .single();

  if (!event) return { error: 'Event not found' };
  if (event.organizer_id !== user.id) return { error: 'Not the organizer' };
  if (event.status !== 'published') return { error: 'Cannot complete this event' };

  const { error } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('id', eventId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function duplicateEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: original } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (!original) return { error: 'Event not found' };

  const { id: _id, created_at: _ca, updated_at: _ua, private_token: _pt, status: _s, ...rest } = original;

  const newDate = new Date();
  newDate.setDate(newDate.getDate() + 7);

  const { data: newEvent, error } = await supabase
    .from('events')
    .insert({
      ...rest,
      organizer_id: user.id,
      starts_at: newDate.toISOString(),
      status: 'draft',
      is_private: false,
      private_token: null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, event: newEvent };
}

export async function submitReview(eventId: string, rating: number, comment?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: attendance } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (!attendance || attendance.status !== 'going') {
    return { error: 'You must attend to leave a review' };
  }

  const { data: existing } = await supabase
    .from('event_reviews')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (existing) return { error: 'You already reviewed this event' };

  const { error } = await supabase.from('event_reviews').insert({
    event_id: eventId,
    user_id: user.id,
    rating,
    comment: comment || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getEventReviews(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_reviews')
    .select('*, profiles:user_id(display_name, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function publishDraft(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('events')
    .update({ status: 'published' })
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .eq('status', 'draft');

  if (error) return { error: error.message };
  return { success: true };
}
