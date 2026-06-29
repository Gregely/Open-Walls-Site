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
import { WANDESFORD_ATTENDEE_TYPES } from '../types/applicationSettings';

// ── Helpers ───────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  ...APPLICATION_STATUSES,
];

type TypeFilter =
  | 'all'
  | 'default'
  | 'wandesford'
  | typeof WANDESFORD_ATTENDEE_TYPES[number];

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All forms' },
  { value: 'default', label: 'Default' },
  { value: 'wandesford', label: 'Wandesford' },
  ...WANDESFORD_ATTENDEE_TYPES.map((t) => ({ value: t as TypeFilter, label: t })),
];

function matchesTypeFilter(app: Application, filter: TypeFilter): boolean {
  if (filter === 'all') return true;
  const formType = app.form_type ?? 'default';
  const attendeeType = app.attendee_type ?? '';
  if (filter === 'default') return formType === 'default';
  if (filter === 'wandesford') return formType === 'wandesford';
  return attendeeType === filter;
}

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

const ANSWER_LABELS: Record<string, string> = {
  socials: 'Socials',
  description: 'Description',
  bio: 'Bio',
  reference_link: 'Reference link',
  setup_requirements: 'Setup / space requirements',
  video_link: 'Video link',
  duration: 'Duration',
  technical_needs: 'Technical needs',
  reference_link_optional: 'Reference link (optional)',
  attendee_count: 'Number of attendees',
  materials: 'Materials',
  charge: 'Charge',
  charge_amount: 'Charge amount',
};

function answerLabel(key: string): string {
  return ANSWER_LABELS[key] ?? key.replace(/_/g, ' ');
}

// ── CSV export ────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const CSV_HEADERS = [
  'Submitted At',
  'Status',
  'Form Type',
  'Attendee Type',
  'Full Name',
  'Email',
  'Contact Number',
  'Admin Notes',
  'Art Type',
  'Work Size/Quantity',
  'Display Method',
  'Promotion Consent',
  'Instagram Username',
  'Other Ideas/Questions',
  'Socials',
  'Description',
  'Bio',
  'Reference Link',
  'Video Link',
  'Duration',
  'Technical Needs',
  'Reference Link Optional',
  'Setup/Space Requirements',
  'Number of Attendees',
  'Materials',
  'Charge',
  'Charge Amount',
  'Application ID',
];

function appToCsvRow(app: Application): string[] {
  const answers = (app.answers ?? {}) as Record<string, unknown>;
  const ans = (key: string) => String(answers[key] ?? '');
  return [
    app.created_at
      ? new Date(app.created_at).toISOString().replace('T', ' ').slice(0, 16)
      : '',
    app.status,
    app.form_type ?? 'default',
    app.attendee_type ?? '',
    app.name,
    app.email,
    app.phone_number,
    app.organiser_notes ?? '',
    app.art_type ?? '',
    app.work_size_or_count ?? '',
    app.display_method ?? '',
    app.wants_social_promotion ?? '',
    app.social_username ?? '',
    app.other_ideas_or_questions ?? '',
    ans('socials'),
    ans('description'),
    ans('bio'),
    ans('reference_link'),
    ans('video_link'),
    ans('duration'),
    ans('technical_needs'),
    ans('reference_link_optional'),
    ans('setup_requirements'),
    ans('attendee_count'),
    ans('materials'),
    ans('charge'),
    ans('charge_amount'),
    app.id,
  ];
}

function buildCSV(apps: Application[]): string {
  const lines = [
    CSV_HEADERS.map(csvEscape).join(','),
    ...apps.map((app) => appToCsvRow(app).map(csvEscape).join(',')),
  ];
  return '﻿' + lines.join('\r\n');
}

function buildFilename(
  statusFilter: ApplicationStatus | 'all',
  typeFilter: TypeFilter,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const filterSlug = `${statusFilter}-${typeFilter.replace(/\s+/g, '-').toLowerCase()}`;
  return `open-walls-applications-${filterSlug}-${today}.csv`;
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

  const formType = app.form_type ?? 'default';
  const attendeeType = app.attendee_type ?? '';
  const answers = app.answers ?? {};
  const isWandesford = formType === 'wandesford';

  return (
    <article className="app-card" data-status={app.status}>
      {/* Header row */}
      <div className="app-card__header">
        <div className="app-card__meta">
          <strong className="app-card__name">{app.name}</strong>
          <span className="app-card__date">{formatDate(app.created_at)}</span>
          {/* Form type badge */}
          <span className={`app-card__form-badge app-card__form-badge--${formType}`}>
            {isWandesford ? 'Wandesford' : 'Default'}
          </span>
          {/* Attendee type (Wandesford) or art type (default) */}
          {isWandesford && attendeeType && (
            <span className="app-card__art-type">{attendeeType}</span>
          )}
          {!isWandesford && app.art_type && (
            <span className="app-card__art-type">{app.art_type}</span>
          )}
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

      {/* Contact row */}
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

      {/* Answers */}
      {isWandesford ? (
        // Wandesford: render structured answers from JSON
        Object.keys(answers).length > 0 && (
          <div className="app-card__answers">
            {Object.entries(answers).map(([key, value]) => {
              const text = String(value ?? '');
              if (!text) return null;
              return (
                <div key={key} className="app-card__answer">
                  <span className="app-card__answer-label">{answerLabel(key)}</span>
                  <p className="app-card__answer-text">{text}</p>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // Default form: render the fixed columns
        (app.work_size_or_count ||
          app.display_method ||
          app.wants_social_promotion ||
          app.other_ideas_or_questions) && (
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
        )
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loadTick, setLoadTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Application | null>(null);

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

  const filtered = apps
    .filter((a) => statusFilter === 'all' || a.status === statusFilter)
    .filter((a) => matchesTypeFilter(a, typeFilter));

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
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, organiser_notes: notes.trim() || null } : a)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save notes.');
      throw err;
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

  useEffect(() => {
    onNewCount?.(newCount);
  }, [newCount, onNewCount]);

  const handleExport = () => {
    const csv = buildCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(statusFilter, typeFilter);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className="admin-card">
        <div className="admin-section-title">
          <h2>
            Applications
            {newCount > 0 && <span className="app-new-badge">{newCount} new</span>}
          </h2>
          <span>
            {loading ? 'Loading…' : `${filtered.length} shown`}
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

        {/* Form / attendee type filter */}
        <div className="app-filter app-filter--secondary">
          {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`app-filter__btn${typeFilter === value ? ' app-filter__btn--active' : ''}`}
              onClick={() => setTypeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Export */}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="admin-mini-btn"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            Export current view CSV
          </button>
        </div>

        {error && <div className="admin-error admin-error--bar">{error}</div>}

        {!loading && filtered.length === 0 && (
          <p className="admin-muted" style={{ marginTop: '16px' }}>
            {apps.length === 0
              ? 'No applications yet. Share the /apply link when the next show opens!'
              : 'No applications match the current filters.'}
          </p>
        )}

        <div className="app-list">
          {filtered.map((app) => (
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
