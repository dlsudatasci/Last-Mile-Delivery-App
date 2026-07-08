import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

function fmt(ms: number) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDist(m: number) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;
}

function fmtDur(s: number) {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtSpeed(ms: number) {
  if (!ms) return '—';
  return `${(ms * 3.6).toFixed(1)} km/h`;
}

export default async function RidesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const snap = await adminDb.collection('rides').orderBy('createdAt', 'desc').limit(100).get();
  const rides = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Rides</h1>
            <p className="page-subtitle">{rides.length} recorded delivery trips (most recent 100)</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ride Name</th>
                  <th>User ID</th>
                  <th>Distance</th>
                  <th>Duration</th>
                  <th>Avg Speed</th>
                  <th>Max Speed</th>
                  <th>Elevation</th>
                  <th>Public</th>
                  <th>GPX</th>
                  <th>Web</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🛵</div>
                        <div className="empty-state-title">No rides yet</div>
                      </div>
                    </td>
                  </tr>
                ) : rides.map(r => (
                  <tr key={String(r.id)}>
                    <td style={{ fontWeight: 600 }}>{String(r.rideName || '—')}</td>
                    <td className="td-mono truncate" style={{ maxWidth: 140 }}>{String(r.userId || '—')}</td>
                    <td>{fmtDist(Number(r.distance))}</td>
                    <td>{fmtDur(Number(r.duration))}</td>
                    <td>{fmtSpeed(Number(r.averageSpeed))}</td>
                    <td>{fmtSpeed(Number(r.maxSpeed))}</td>
                    <td>{r.elevationGain ? `${Number(r.elevationGain).toFixed(0)} m` : '—'}</td>
                    <td><span className={`badge ${r.isPublic ? 'badge-success' : 'badge-muted'}`}>{r.isPublic ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge ${r.isGPXUpload ? 'badge-accent' : 'badge-muted'}`}>{r.isGPXUpload ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge ${r.fromWeb ? 'badge-info' : 'badge-muted'}`}>{r.fromWeb ? 'Yes' : 'No'}</span></td>
                    <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(Number(r.createdAt))}</td>
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
