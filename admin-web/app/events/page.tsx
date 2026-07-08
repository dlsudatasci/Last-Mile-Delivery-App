import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import EventsManager from '@/components/EventsManager';

export default async function EventsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const snap = await adminDb.collection('events').orderBy('createdAt', 'desc').limit(100).get();
  const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 className="page-title">Events</h1>
                <p className="page-subtitle">{events.length} community events published</p>
              </div>
            </div>
          </div>
          <EventsManager events={events as Parameters<typeof EventsManager>[0]['events']} />
        </div>
      </main>
    </div>
  );
}
