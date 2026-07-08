import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

async function getDashboardStats() {
  const [
    usersSnap,
    ridesSnap,
    studySnap,
    pendingClaimsSnap,
    unreadNotifsSnap,
    ticketsSnap,
  ] = await Promise.all([
    adminDb.collection('users').count().get(),
    adminDb.collection('rides').count().get(),
    adminDb.collection('studyParticipants').where('status', '==', 'joined').count().get(),
    adminDb.collection('compensationClaims').where('status', '==', 'pending_validation').count().get(),
    adminDb.collection('adminNotifications').where('status', '==', 'unread').count().get(),
    adminDb.collection('tickets').where('status', '==', 'pending').count().get(),
  ]);

  return {
    totalUsers: usersSnap.data().count,
    totalRides: ridesSnap.data().count,
    activeParticipants: studySnap.data().count,
    pendingClaims: pendingClaimsSnap.data().count,
    unreadNotifications: unreadNotifsSnap.data().count,
    pendingTickets: ticketsSnap.data().count,
  };
}

async function getRecentNotifications() {
  const snap = await adminDb
    .collection('adminNotifications')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((n: Record<string, unknown>) => n.status === 'unread')
    .slice(0, 5);
}

async function getRecentClaims() {
  const snap = await adminDb
    .collection('compensationClaims')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((c: Record<string, unknown>) => c.status === 'pending_validation')
    .slice(0, 5);
}

function formatDate(ts: number | { _seconds: number }) {
  const ms = typeof ts === 'object' ? ts._seconds * 1000 : ts;
  return new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [stats, recentNotifs, recentClaims] = await Promise.all([
    getDashboardStats(),
    getRecentNotifications(),
    getRecentClaims(),
  ]);

  const STAT_CARDS = [
    { label: 'Registered Users', value: stats.totalUsers, icon: '👤', color: '#4f8ef7', bg: 'rgba(79,142,247,0.1)' },
    { label: 'Total Rides', value: stats.totalRides, icon: '🛵', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Study Participants', value: stats.activeParticipants, icon: '🔬', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Pending Claims', value: stats.pendingClaims, icon: '💰', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Unread Notifications', value: stats.unreadNotifications, icon: '🔔', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Open Tickets', value: stats.pendingTickets, icon: '🎫', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  ];

  return (
    <div className="admin-layout">
      <Sidebar unreadCount={stats.unreadNotifications} />
      <main className="admin-main">
        <div className="page-content">
          <div className="page-header">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Welcome back — here&apos;s a snapshot of the Devia research study.</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {STAT_CARDS.map(card => (
              <div key={card.label} className="stat-card" style={{ ['--card-accent' as string]: card.color }}>
                <div className="stat-card-icon" style={{ background: card.bg }}>
                  {card.icon}
                </div>
                <div className="stat-card-value">{card.value}</div>
                <div className="stat-card-label">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Two-column lower section */}
          <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
            {/* Recent Notifications */}
            <div className="card" style={{ flex: 1, minWidth: 300 }}>
              <div className="card-header">
                <span className="card-title">🔔 Unread Notifications</span>
                <Link href="/notifications" className="btn btn-secondary btn-sm">View all</Link>
              </div>
              {recentNotifs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <div className="empty-state-title">All caught up!</div>
                  <div className="empty-state-text">No unread notifications.</div>
                </div>
              ) : (
                <div style={{ padding: '0' }}>
                  {(recentNotifs as Record<string, unknown>[]).map((n) => (
                    <div key={String(n.id)} style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>
                        {String(n.type).includes('quota') ? '📋' : '💳'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {String(n.type).includes('quota') ? 'Quota Reached' : 'Compensation Claim'}
                        </div>
                        <div className="td-muted truncate">{String(n.email ?? n.userId)}</div>
                      </div>
                      <div className="td-muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {n.createdAt ? formatDate(n.createdAt as number) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Claims */}
            <div className="card" style={{ flex: 1, minWidth: 300 }}>
              <div className="card-header">
                <span className="card-title">💰 Pending Claims</span>
                <Link href="/claims" className="btn btn-secondary btn-sm">View all</Link>
              </div>
              {recentClaims.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <div className="empty-state-title">No pending claims</div>
                  <div className="empty-state-text">All compensation claims are processed.</div>
                </div>
              ) : (
                <div>
                  {(recentClaims as Record<string, unknown>[]).map((c) => (
                    <div key={String(c.id)} style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {String(c.referenceNumber ?? '—')}
                        </div>
                        <div className="td-muted truncate">{String(c.paymentMethod ?? '—').toUpperCase()} • ₱{String(c.amount ?? 250)}</div>
                      </div>
                      <div className="badge badge-warning">Pending</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
