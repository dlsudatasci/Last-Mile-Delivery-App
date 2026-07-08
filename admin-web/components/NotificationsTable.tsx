'use client';

import { useState, useTransition } from 'react';
import StatusBadge from '@/components/StatusBadge';

interface Notification {
  id: string;
  type?: string;
  userId?: string;
  email?: string;
  status?: string;
  recordedSubmissions?: number;
  requiredSubmissions?: number;
  referenceNumber?: string;
  amount?: number;
  createdAt?: { _seconds: number } | number;
}

function fmt(ts: { _seconds: number } | number | undefined) {
  if (!ts) return '—';
  const ms = typeof ts === 'object' ? ts._seconds * 1000 : ts;
  return new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationsTable({ notifications: initial }: { notifications: Notification[] }) {
  const [notifs, setNotifs] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const markRead = (id: string) => {
    startTransition(async () => {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    });
  };

  const markAllRead = () => {
    const unread = notifs.filter(n => n.status === 'unread');
    unread.forEach(n => markRead(n.id));
  };

  const unreadCount = notifs.filter(n => n.status === 'unread').length;

  return (
    <>
      {unreadCount > 0 && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted">{unreadCount} unread notifications</span>
          <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={markAllRead}>
            ✓ Mark all as read
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Email / User</th>
              <th>Details</th>
              <th>Status</th>
              <th>Received</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifs.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <div className="empty-state-title">No notifications</div>
                    <div className="empty-state-text">Notifications appear when riders reach quota or submit claims.</div>
                  </div>
                </td>
              </tr>
            ) : notifs.map(n => (
              <tr key={n.id} style={{ opacity: n.status === 'read' ? 0.6 : 1 }}>
                <td>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>
                      {String(n.type).includes('quota') ? '📋' : '💳'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      {String(n.type).includes('quota') ? 'Quota Reached' : 'Claim Alert'}
                    </span>
                  </div>
                </td>
                <td className="td-muted truncate" style={{ maxWidth: 180 }}>
                  {n.email ?? n.userId ?? '—'}
                </td>
                <td className="td-muted">
                  {String(n.type).includes('quota')
                    ? `${n.recordedSubmissions ?? '?'}/${n.requiredSubmissions ?? 10} rides`
                    : `${n.referenceNumber ?? '—'} · ₱${n.amount ?? 250}`
                  }
                </td>
                <td><StatusBadge value={n.status ?? 'unread'} /></td>
                <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(n.createdAt)}</td>
                <td>
                  {n.status === 'unread' ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={isPending}
                      onClick={() => markRead(n.id)}
                    >
                      ✓ Read
                    </button>
                  ) : (
                    <span className="td-muted text-sm">Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
