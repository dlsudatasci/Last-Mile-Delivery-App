import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticketId } = await req.json();
  if (!ticketId) return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 });

  await adminDb.collection('tickets').doc(ticketId).update({ status: 'resolved' });
  return NextResponse.json({ ok: true });
}
