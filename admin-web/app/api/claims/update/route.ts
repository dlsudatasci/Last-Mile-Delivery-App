import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';

const VALID_STATUSES = ['pending_validation', 'ready_to_claim', 'paid', 'rejected'];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, status } = await req.json();
  if (!userId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await adminDb.collection('compensationClaims').doc(userId).update({
    status,
    updatedAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
