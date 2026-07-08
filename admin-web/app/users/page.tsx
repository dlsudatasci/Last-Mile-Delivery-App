import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';

function formatDate(ts: string | number) {
  if (!ts) return '—';
  const d = new Date(ts as string);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getInitials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const snap = await adminDb.collection('users').orderBy('createdAt', 'desc').limit(100).get();
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Users</h1>
            <p className="page-subtitle">{users.length} registered riders (most recent 100)</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Gender</th>
                  <th>Age Range</th>
                  <th>Experience</th>
                  <th>Policies</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon">👤</div>
                        <div className="empty-state-title">No users yet</div>
                      </div>
                    </td>
                  </tr>
                ) : users.map(u => (
                  <tr key={String(u.id)}>
                    <td>
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={String(u.avatarUrl)} alt="" width={32} height={32} className="avatar" />
                        ) : (
                          <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12 }}>
                            {getInitials(String(u.fullName || u.username || ''))}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{String(u.fullName || u.username || '—')}</div>
                          <div className="td-muted truncate" style={{ maxWidth: 180 }}>{String(u.email || '—')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-mono">{String(u.phone || '—')}</td>
                    <td>{String(u.city || '—')}</td>
                    <td>{String(u.gender || '—')}</td>
                    <td>{String(u.ageRange || '—')}</td>
                    <td>{String(u.yearsExperience || '—')}</td>
                    <td>
                      <StatusBadge value={u.acceptedPolicies ? 'joined' : 'removed'} />
                    </td>
                    <td className="td-muted">{formatDate(String(u.createdAt || ''))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
