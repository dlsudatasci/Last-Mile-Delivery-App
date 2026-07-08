'use client';

import { useState, useTransition } from 'react';
import StatusBadge from '@/components/StatusBadge';

type ClaimStatus = 'pending_validation' | 'ready_to_claim' | 'paid' | 'rejected';

interface Claim {
  id: string;
  email?: string;
  paymentMethod?: string;
  accountName?: string;
  accountNumber?: string;
  phoneNumber?: string;
  status?: ClaimStatus;
  referenceNumber?: string;
  recordedSubmissions?: number;
  amount?: number;
  createdAt?: number;
  updatedAt?: number;
}

function fmt(ms: number) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ClaimsTable({ claims: initialClaims }: { claims: Claim[] }) {
  const [claims, setClaims] = useState(initialClaims);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateStatus = (userId: string, newStatus: ClaimStatus) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/claims/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, status: newStatus }),
        });
        if (!res.ok) throw new Error('Update failed');
        setClaims(prev => prev.map(c => c.id === userId ? { ...c, status: newStatus } : c));
        setMessage({ type: 'success', text: `Status updated to "${newStatus}"` });
      } catch {
        setMessage({ type: 'error', text: 'Failed to update status. Please try again.' });
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
              <th>Reference</th>
              <th>Email</th>
              <th>Method</th>
              <th>Account Name</th>
              <th>Account #</th>
              <th>Phone</th>
              <th>Rides</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💰</div>
                    <div className="empty-state-title">No claims yet</div>
                    <div className="empty-state-text">Compensation claims will appear here once submitted.</div>
                  </div>
                </td>
              </tr>
            ) : claims.map(c => (
              <tr key={c.id}>
                <td className="td-mono">{c.referenceNumber ?? '—'}</td>
                <td className="td-muted truncate" style={{ maxWidth: 160 }}>{c.email ?? '—'}</td>
                <td><span className="badge badge-accent">{String(c.paymentMethod ?? '—').toUpperCase()}</span></td>
                <td>{c.accountName ?? '—'}</td>
                <td className="td-mono">{c.accountNumber ?? '—'}</td>
                <td className="td-mono">{c.phoneNumber ?? '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.recordedSubmissions ?? '—'}</td>
                <td style={{ fontWeight: 700, color: 'var(--success)' }}>₱{c.amount ?? 250}</td>
                <td><StatusBadge value={c.status ?? 'pending_validation'} /></td>
                <td className="td-muted">{fmt(c.createdAt ?? 0)}</td>
                <td>
                  <div className="flex gap-2">
                    {c.status === 'pending_validation' && (
                      <button
                        className="btn btn-success btn-sm"
                        disabled={isPending}
                        onClick={() => updateStatus(c.id, 'ready_to_claim')}
                      >
                        ✓ Validate
                      </button>
                    )}
                    {(c.status === 'pending_validation' || c.status === 'ready_to_claim') && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isPending}
                          onClick={() => updateStatus(c.id, 'paid')}
                        >
                          💸 Mark Paid
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={isPending}
                          onClick={() => updateStatus(c.id, 'rejected')}
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {(c.status === 'paid' || c.status === 'rejected') && (
                      <span className="td-muted text-sm">Done</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
