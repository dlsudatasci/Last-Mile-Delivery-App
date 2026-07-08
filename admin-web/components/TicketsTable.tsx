'use client';

import { useState, useTransition } from 'react';
import StatusBadge from '@/components/StatusBadge';

interface Ticket {
  id: string;
  userId?: string;
  subject?: string;
  description?: string;
  status?: string;
  createdAt?: number;
}

function fmt(ms: number) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TicketsTable({ tickets: initial }: { tickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resolve = (ticketId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/tickets/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId }),
        });
        if (!res.ok) throw new Error();
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
        setMessage({ type: 'success', text: 'Ticket marked as resolved.' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to resolve ticket.' });
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  return (
    <>
      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'} mb-4`}>
          <span>{message.type === 'success' ? '✅' : '⚠'}</span>
          <span>{message.text}</span>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 24 }} />
              <th>Subject</th>
              <th>User ID</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎫</div>
                    <div className="empty-state-title">No tickets</div>
                    <div className="empty-state-text">All quiet — no support requests yet.</div>
                  </div>
                </td>
              </tr>
            ) : tickets.map(t => (
              <>
                <tr key={t.id}>
                  <td>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '2px 6px' }}
                      onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                      title="Toggle description"
                    >
                      {expanded === t.id ? '▲' : '▼'}
                    </button>
                  </td>
                  <td style={{ fontWeight: 600 }}>{t.subject ?? '—'}</td>
                  <td className="td-mono truncate" style={{ maxWidth: 160 }}>{t.userId ?? '—'}</td>
                  <td><StatusBadge value={t.status ?? 'pending'} /></td>
                  <td className="td-muted">{fmt(t.createdAt ?? 0)}</td>
                  <td>
                    {t.status === 'pending' ? (
                      <button
                        className="btn btn-success btn-sm"
                        disabled={isPending}
                        onClick={() => resolve(t.id)}
                      >
                        ✓ Resolve
                      </button>
                    ) : (
                      <span className="td-muted text-sm">Done</span>
                    )}
                  </td>
                </tr>
                {expanded === t.id && (
                  <tr key={`${t.id}-detail`} style={{ background: 'var(--bg-surface)' }}>
                    <td colSpan={6} style={{ padding: '12px 24px' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Description:</strong><br />
                        {t.description ?? 'No description provided.'}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
