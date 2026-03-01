import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/en/login', request.url));
  }

  const { data: attendance } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();

  if (!attendance || attendance.status !== 'going') {
    return NextResponse.redirect(new URL(`/en/events/${eventId}?error=not-attending`, request.url));
  }

  await supabase
    .from('event_attendees')
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  return NextResponse.redirect(new URL(`/en/events/${eventId}?confirmed=true`, request.url));
}
