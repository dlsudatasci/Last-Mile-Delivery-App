import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import NotificationsTable from '@/components/NotificationsTable';

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const snap = await adminDb
    .collection('adminNotifications')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const unread = notifications.filter(n => (n as Record<string,unknown>).status === 'unread').length;

  return (
    <div className="admin-layout">
      <Sidebar unreadCount={unread} />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Admin Notifications</h1>
            <p className="page-subtitle">{unread} unread · {notifications.length} total</p>
          </div>
          <NotificationsTable
            notifications={notifications as Parameters<typeof NotificationsTable>[0]['notifications']}
          />
        </div>
      </main>
    </div>
  );
}
