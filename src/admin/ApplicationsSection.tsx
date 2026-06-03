import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  deleteApplication,
  listApplications,
  updateApplicationNotes,
  updateApplicationStatus,
} from '../lib/applicationApi';
import type { Application, ApplicationStatus } from '../types/application';
import { APPLICATION_STATUSES } from '../types/application';

// ── Helpers ───────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  ...APPLICATION_STATUSES,
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    // Silently fail — clipboard access may be denied
  });
}

// ── ApplicationCard ───────────────────────────────────────────────────────

type CardProps = {
  app: Application;
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<void>;
  onNotesSaved: (id: string, notes: string) => Promise<void>;
  onDeleteRequest: (app: Application) => void;
};

function ApplicationCard({ app, onStatusChange, onNotesSaved, onDeleteRequest }: CardProps) {
  const [notes, setNotes] = useState(app.organiser_notes ?? '');
  const [notesState, setNotesState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [statusSaving, setStatusSaving] = useState(false);
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null);

  // Sync notes from parent (e.g. after a reload)
  useEffect(() => {
    setNotes(app.organiser_notes ?? '');
  }, [app.organiser_notes]);

  const handleCopy = (type: 'email' | 'phone', value: string) => {
    copyToClipboard(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setStatusSaving(true);
    try {
      await onStatusChange(app.id, newStatus);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesState('saving');
    try {
      await onNotesSaved(app.id, notes);
      setNotesState('saved');
      setTimeout(() => setNotesState('idle'), 2200);
    } catch {
      setNotesState('idle');
    }
  };

  return (
    <article className="app-card" data-status={app.status}>
      {/* Header row: name, date, art type, status, delete */}
      <div className="app-card__header">
        <div className="app-card__meta">
          <strong className="app-card__name">{app.name}</strong>
          <span className="app-card__date">{formatDate(app.created_at)}</span>
          {app.art_type && <span className="app-card__art-type">{app.art_type}</span>}
        </div>
        <div className="app-card__controls">
          <select
            className="app-card__status-select"
            value={app.status}
            disabled={statusSaving}
            onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
            aria-label={`Status for ${app.name}`}
          >
            {APPLICATION_STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="admin-mini-btn admin-mini-btn--danger"
            onClick={() => onDeleteRequest(app)}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Contact row: email + phone with copy buttons */}
      <div className="app-card__contacts">
        <span className="app-card__contact-item">
          <span className="app-card__contact-label">Email:</span>
          <a href={`mailto:${app.email}`} className="app-card__contact-value">
            {app.email}
          </a>
          <button
            type="button"
            className="admin-mini-btn admin-mini-btn--ghost app-card__copy-btn"
            onClick={() => handleCopy('email', app.email)}
          >
            {copied === 'email' ? 'Copied!' : 'Copy'}
          </button>
        </span>
        <span className="app-card__contact-item">
          <span className="app-card__contact-label">Phone:</span>
          <a href={`tel:${app.phone_number}`} className="app-card__contact-value">
            {app.phone_number}
          </a>
          <button
            type="button"
            className="admin-mini-btn admin-mini-btn--ghost app-card__copy-btn"
            onClick={() => handleCopy('phone', app.phone_number)}
          >
            {copied === 'phone' ? 'Copied!' : 'Copy'}
          </button>
        </span>
      </div>

      {/* Answers: only render non-empty optional fields */}
      {(app.work_size_or_count || app.display_method || app.wants_social_promotion || app.other_ideas_or_questions) && (
        <div className="app-card__answers">
          {app.work_size_or_count && (
            <div className="app-card__answer">
              <span className="app-card__answer-label">Work size / count</span>
              <p className="app-card__answer-text">{app.work_size_or_count}</p>
            </div>
          )}
          {app.display_method && (
            <div className="app-card__answer">
              <span className="app-card__answer-label">Display method</span>
              <p className="app-card__answer-text">{app.display_method}</p>
            </div>
          )}
          {app.wants_social_promotion && (
            <div className="app-card__answer">
              <span className="app-card__answer-label">Social promotion</span>
              <p className="app-card__answer-text">
                {app.wants_social_promotion}
                {app.social_username ? ` — ${app.social_username}` : ''}
              </p>
            </div>
          )}
          {app.other_ideas_or_questions && (
            <div className="app-card__answer">
              <span className="app-card__answer-label">Ideas / questions</span>
              <p className="app-card__answer-text">{app.other_ideas_or_questions}</p>
            </div>
          )}
        </div>
      )}

      {/* Organiser notes */}
      <div className="app-card__notes">
        <label className="app-card__notes-label" htmlFor={`notes-${app.id}`}>
          Organiser notes
        </label>
        <textarea
          id={`notes-${app.id}`}
          className="app-card__notes-input"
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            if (notesState === 'saved') setNotesState('idle');
          }}
          placeholder="Internal notes, confirmation status, follow-up needed…"
        />
        <button
          type="button"
          className="admin-mini-btn"
          onClick={handleSaveNotes}
          disabled={notesState === 'saving'}
        >
          {notesState === 'saving' ? 'Saving…' : notesState === 'saved' ? 'Saved ✓' : 'Save notes'}
        </button>
      </div>
    </article>
  );
}

// ── ApplicationsSection ───────────────────────────────────────────────────

export function ApplicationsSection({ onNewCount }: { onNewCount?: (count: number) => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [loadTick, setLoadTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Application | null>(null);

  // Load all applications; client-side filter by status
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    listApplications()
      .then((data) => {
        if (alive) setApps(data);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load applications.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loadTick]);

  const displayed = statusFilter === 'all' ? apps : apps.filter((a) => a.status === statusFilter);

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      await updateApplicationStatus(id, status);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status.');
    }
  };

  const handleNotesSaved = async (id: string, notes: string) => {
    try {
      await updateApplicationNotes(id, notes);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, organiser_notes: notes.trim() || null } : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save notes.');
      throw err; // re-throw so the card resets its save state
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteApplication(target.id);
      setApps((prev) => prev.filter((a) => a.id !== target.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete application.');
    }
  };

  const newCount = apps.filter((a) => a.status === 'new').length;

  // Report new-application count to parent (used for the tab label)
  useEffect(() => {
    onNewCount?.(newCount);
  }, [newCount, onNewCount]);

  return (
    <>
      <section className="admin-card">
        <div className="admin-section-title">
          <h2>
            Applications
            {newCount > 0 && <span className="app-new-badge">{newCount} new</span>}
          </h2>
          <span>
            {loading ? 'Loading…' : `${displayed.length} ${statusFilter === 'all' ? 'total' : statusFilter}`}
          </span>
        </div>

        {/* Status filter */}
        <div className="app-filter">
          {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`app-filter__btn${statusFilter === value ? ' app-filter__btn--active' : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {label}
              {value === 'new' && newCount > 0 && ` (${newCount})`}
            </button>
          ))}
          <button
            type="button"
            className="admin-mini-btn"
            onClick={() => setLoadTick((t) => t + 1)}
            disabled={loading}
          >
            Reload
          </button>
        </div>

        {error && <div className="admin-error admin-error--bar">{error}</div>}

        {!loading && displayed.length === 0 && (
          <p className="admin-muted" style={{ marginTop: '16px' }}>
            {statusFilter === 'all'
              ? 'No applications yet. Share the /apply link when the next show opens!'
              : `No applications with status "${statusFilter}".`}
          </p>
        )}

        {/* Application cards */}
        <div className="app-list">
          {displayed.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onStatusChange={handleStatusChange}
              onNotesSaved={handleNotesSaved}
              onDeleteRequest={setConfirmDelete}
            />
          ))}
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete application?"
        message={
          confirmDelete
            ? `This will permanently delete the application from ${confirmDelete.name} (${confirmDelete.email}). This cannot be undone.`
            : ''
        }
        confirmLabel="Delete application"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
