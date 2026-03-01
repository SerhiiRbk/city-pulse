import { NextResponse } from 'next/server';
import { generateICalEvent } from '@/lib/actions/calendar';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ical = await generateICalEvent(eventId);

  if (!ical) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${eventId}.ics"`,
    },
  });
}
