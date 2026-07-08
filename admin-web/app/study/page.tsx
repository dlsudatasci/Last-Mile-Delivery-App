import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';

function fmt(ms: number) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function StudyPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const snap = await adminDb.collection('studyParticipants').orderBy('joinedAt', 'desc').limit(200).get();
  const participants = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];

  const joined = participants.filter(p => p.status === 'joined').length;
  const removed = participants.filter(p => p.status === 'removed').length;

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Study Participants</h1>
            <p className="page-subtitle">{joined} active · {removed} removed · {participants.length} total</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rider Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Platform</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Terms</th>
                  <th>Privacy</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🔬</div>
                        <div className="empty-state-title">No participants yet</div>
                      </div>
                    </td>
                  </tr>
                ) : participants.map(p => (
                  <tr key={String(p.id)}>
                    <td style={{ fontWeight: 600 }}>{String(p.riderName || '—')}</td>
                    <td className="td-muted truncate" style={{ maxWidth: 180 }}>{String(p.email || '—')}</td>
                    <td className="td-mono">{String(p.phoneNumber || '—')}</td>
                    <td>{String(p.deliveryPlatform || '—')}</td>
                    <td>{String(p.vehicleType || '—')}</td>
                    <td><StatusBadge value={String(p.status || 'joined')} /></td>
                    <td><span className={`badge ${p.acceptedTerms ? 'badge-success' : 'badge-danger'}`}>{p.acceptedTerms ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge ${p.acceptedPrivacy ? 'badge-success' : 'badge-danger'}`}>{p.acceptedPrivacy ? 'Yes' : 'No'}</span></td>
                    <td className="td-muted">{fmt(Number(p.joinedAt))}</td>
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
