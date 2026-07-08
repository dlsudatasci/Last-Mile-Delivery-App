import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TicketsTable from '@/components/TicketsTable';

export default async function TicketsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const snap = await adminDb.collection('tickets').orderBy('createdAt', 'desc').limit(200).get();
  const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const pending = tickets.filter(t => (t as Record<string,unknown>).status === 'pending').length;

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Support Tickets</h1>
            <p className="page-subtitle">{pending} open · {tickets.length} total</p>
          </div>
          <TicketsTable tickets={tickets as Parameters<typeof TicketsTable>[0]['tickets']} />
        </div>
      </main>
    </div>
  );
}
