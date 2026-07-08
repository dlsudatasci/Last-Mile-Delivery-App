import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { notificationId } = await req.json();
  if (!notificationId) return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });

  await adminDb.collection('adminNotifications').doc(notificationId).update({ status: 'read' });
  return NextResponse.json({ ok: true });
}
