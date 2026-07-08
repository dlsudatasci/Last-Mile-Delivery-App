import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, eventName, eventDescription, eventDate, eventLocation, eventOrganizer, eventOrganizerEmail, eventOrganizerPhone } = body;

  if (!eventName || !eventDescription || !eventDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const payload = {
    eventName,
    eventDescription,
    eventDate,
    eventLocation: eventLocation ?? '',
    eventOrganizer: eventOrganizer ?? '',
    eventOrganizerEmail: eventOrganizerEmail ?? '',
    eventOrganizerPhone: eventOrganizerPhone ?? '',
  };

  if (id) {
    // Update existing
    await adminDb.collection('events').doc(id).update(payload);
    return NextResponse.json({ ok: true, id });
  } else {
    // Create new
    const ref = await adminDb.collection('events').add({
      ...payload,
      createdAt: Date.now(),
    });
    return NextResponse.json({ ok: true, id: ref.id });
  }
}
