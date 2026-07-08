'use client';

import { useState, useTransition } from 'react';

interface Event {
  id: string;
  eventName?: string;
  eventDescription?: string;
  eventDate?: number;
  eventLocation?: string;
  eventOrganizer?: string;
  eventOrganizerEmail?: string;
  eventOrganizerPhone?: string;
  createdAt?: number;
}

interface EventForm {
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventLocation: string;
  eventOrganizer: string;
  eventOrganizerEmail: string;
  eventOrganizerPhone: string;
}

const EMPTY_FORM: EventForm = {
  eventName: '', eventDescription: '', eventDate: '',
  eventLocation: '', eventOrganizer: '', eventOrganizerEmail: '', eventOrganizerPhone: '',
};

function fmt(ms: number) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDateInput(ms: number) {
  if (!ms) return '';
  return new Date(ms).toISOString().slice(0, 10);
}

export default function EventsManager({ events: initial }: { events: Event[] }) {
  const [events, setEvents] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (ev: Event) => {
    setEditing(ev);
    setForm({
      eventName: ev.eventName ?? '',
      eventDescription: ev.eventDescription ?? '',
      eventDate: fmtDateInput(ev.eventDate ?? 0),
      eventLocation: ev.eventLocation ?? '',
      eventOrganizer: ev.eventOrganizer ?? '',
      eventOrganizerEmail: ev.eventOrganizerEmail ?? '',
      eventOrganizerPhone: ev.eventOrganizerPhone ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          ...form,
          eventDate: form.eventDate ? new Date(form.eventDate).getTime() : Date.now(),
          id: editing?.id ?? '',
        };
        const res = await fetch('/api/events/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (editing) {
          setEvents(prev => prev.map(ev => ev.id === editing.id ? { ...ev, ...payload, id: editing.id } : ev));
          setMessage({ type: 'success', text: 'Event updated successfully.' });
        } else {
          setEvents(prev => [{ ...payload, id: String(data.id), createdAt: Date.now() }, ...prev]);
          setMessage({ type: 'success', text: 'Event created and published.' });
        }
        setShowModal(false);
      } catch {
        setMessage({ type: 'error', text: 'Failed to save event. Please try again.' });
      }
      setTimeout(() => setMessage(null), 3500);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/events/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error();
        setEvents(prev => prev.filter(ev => ev.id !== id));
        setMessage({ type: 'success', text: 'Event deleted.' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to delete event.' });
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

      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-muted">{events.length} events total</span>
        <button id="create-event-btn" className="btn btn-primary" onClick={openCreate}>
          + New Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">No events yet</div>
            <div className="empty-state-text">Create your first community event announcement.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {events.map(ev => (
            <div key={ev.id} className="card" style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
            >
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{ev.eventName}</div>
                  <div className="td-muted" style={{ marginTop: 2 }}>📅 {fmt(ev.eventDate ?? 0)}</div>
                </div>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                  {ev.eventDescription
                    ? ev.eventDescription.length > 120
                      ? ev.eventDescription.slice(0, 120) + '…'
                      : ev.eventDescription
                    : 'No description.'}
                </p>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ev.eventLocation && <span>📍 {ev.eventLocation}</span>}
                  {ev.eventOrganizer && <span>👤 {ev.eventOrganizer}</span>}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ev)}>✏ Edit</button>
                  <button className="btn btn-danger btn-sm" disabled={isPending} onClick={() => handleDelete(ev.id)}>🗑 Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <form className="modal" onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit Event' : 'Create New Event'}</span>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input className="form-input" required value={form.eventName}
                  onChange={e => setForm(p => ({ ...p, eventName: e.target.value }))}
                  placeholder="e.g. Rider Safety Workshop" />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" required value={form.eventDescription}
                  onChange={e => setForm(p => ({ ...p, eventDescription: e.target.value }))}
                  placeholder="Full event announcement…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Event Date *</label>
                  <input className="form-input" type="date" required value={form.eventDate}
                    onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.eventLocation}
                    onChange={e => setForm(p => ({ ...p, eventLocation: e.target.value }))}
                    placeholder="Venue / online" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Organizer</label>
                <input className="form-input" value={form.eventOrganizer}
                  onChange={e => setForm(p => ({ ...p, eventOrganizer: e.target.value }))}
                  placeholder="Name or group" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Organizer Email</label>
                  <input className="form-input" type="email" value={form.eventOrganizerEmail}
                    onChange={e => setForm(p => ({ ...p, eventOrganizerEmail: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Organizer Phone</label>
                  <input className="form-input" value={form.eventOrganizerPhone}
                    onChange={e => setForm(p => ({ ...p, eventOrganizerPhone: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? 'Saving…' : (editing ? 'Save Changes' : 'Publish Event')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
