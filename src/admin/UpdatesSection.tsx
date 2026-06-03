import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { resolveImageUrl } from '../lib/imageUrl';
import { deleteUpdate, loadAllUpdates, saveUpdate, slugify } from '../lib/updatesApi';
import type { Update } from '../types/update';

// ── Blank update factory ──────────────────────────────────────────────────

function blankUpdate(displayOrder: number): Update {
  return {
    id: crypto.randomUUID(),
    title: '',
    slug: '',
    subtitle: '',
    label: '',
    date: '',
    imageUrl: '',
    body: '',
    ctaLabel: '',
    ctaUrl: '',
    published: false,
    pinned: false,
    displayOrder,
  };
}

// ── Field helpers (mirrors AdminPage field components) ────────────────────

function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="admin-field__hint">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="admin-field admin-field--wide">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="admin-field__hint">{hint}</span>}
    </label>
  );
}

// ── Single update editor ──────────────────────────────────────────────────

function UpdateEditor({
  update,
  isOpen,
  onToggle,
  onUpdate,
  onDeleteRequest,
  saving,
}: {
  update: Update;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (u: Update) => void;
  onDeleteRequest: (u: Update) => void;
  saving: boolean;
}) {
  const patch = (changes: Partial<Update>) => onUpdate({ ...update, ...changes });

  const imgSrc = update.imageUrl ? resolveImageUrl(update.imageUrl) : '';

  return (
    <article className={`past-editor past-editor--collapsible${isOpen ? ' past-editor--open' : ''}`}>
      <button
        type="button"
        className="past-editor__toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="past-editor__summary">
          <strong className="past-editor__summary-vol">{update.title || 'New update'}</strong>
          {update.date && <span className="past-editor__summary-meta">{update.date}</span>}
          {update.label && <span className="past-editor__summary-meta">{update.label}</span>}
          {!update.published && <span className="past-editor__badge">Draft</span>}
          {update.pinned && <span className="past-editor__badge">Pinned</span>}
        </span>
        <span className="past-editor__chevron" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="past-editor__content">
          <div className="admin-grid">
            <Field label="Title" value={update.title} onChange={(v) => patch({ title: v })} />
            <Field
              label="Slug"
              value={update.slug}
              hint="URL-safe identifier used in the public URL: /updates/your-slug"
              onChange={(v) => patch({ slug: v })}
            />
            <Field label="Label / tag" value={update.label} onChange={(v) => patch({ label: v })} />
            <Field label="Subtitle" value={update.subtitle} onChange={(v) => patch({ subtitle: v })} />
            <Field label="Date" value={update.date} onChange={(v) => patch({ date: v })} />
            <Field
              label="Display order"
              type="number"
              value={update.displayOrder}
              onChange={(v) => patch({ displayOrder: Number(v) || 0 })}
            />
            <Field
              label="Image URL"
              value={update.imageUrl}
              hint="Direct public image URL (e.g. ImageKit, Cloudinary, or any https:// image link)"
              onChange={(v) => patch({ imageUrl: v })}
            />
            <Field label="CTA label" value={update.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
            <Field label="CTA URL" value={update.ctaUrl} onChange={(v) => patch({ ctaUrl: v })} />
          </div>

          <TextArea
            label="Body"
            value={update.body}
            rows={6}
            hint="Plain text. Use blank lines to separate paragraphs."
            onChange={(v) => patch({ body: v })}
          />

          <div className="past-editor__footer">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={update.published}
                onChange={(e) => patch({ published: e.target.checked })}
              />
              Published
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={update.pinned}
                onChange={(e) => patch({ pinned: e.target.checked })}
              />
              Pinned (appears first)
            </label>

            {imgSrc && (
              <div className="admin-poster-preview-wrap">
                <span className="admin-muted">Image preview</span>
                <img
                  key={update.imageUrl}
                  src={imgSrc}
                  alt={`Preview for ${update.title || 'this update'}`}
                  className="admin-poster-preview"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onLoad={(e) => { e.currentTarget.style.display = ''; }}
                />
              </div>
            )}

            <div className="past-editor__delete-row">
              <button
                type="button"
                className="admin-mini-btn admin-mini-btn--danger"
                onClick={() => onDeleteRequest(update)}
                disabled={saving}
              >
                Delete this update
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ── Main section ──────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function UpdatesSection() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Update | null>(null);
  const prevLength = useRef(updates.length);

  // Dirty-per-update tracking: map of id → boolean
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setLoading(true);
    loadAllUpdates()
      .then(setUpdates)
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-expand newly added updates
  useEffect(() => {
    if (updates.length > prevLength.current && updates.length > 0) {
      setOpenIds((prev) => new Set([...prev, updates[0].id]));
    }
    prevLength.current = updates.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates.length]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleUpdate = (updated: Update) => {
    setUpdates((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setDirtyIds((prev) => new Set([...prev, updated.id]));
    setSaveStatus('idle');
  };

  const handleAdd = () => {
    const newUpdate = blankUpdate((updates.length + 1) * 10);
    // Auto-fill slug from title once the user types it — done on save.
    setUpdates((prev) => [newUpdate, ...prev]);
    setDirtyIds((prev) => new Set([...prev, newUpdate.id]));
    setOpenIds((prev) => new Set([...prev, newUpdate.id]));
    setSaveStatus('idle');
  };

  const handleSave = async (update: Update) => {
    // Auto-generate slug from title if blank
    const toSave: Update = {
      ...update,
      slug: update.slug.trim() || slugify(update.title),
    };

    if (!toSave.slug) {
      setSaveError(`"${update.title || 'Update'}" needs a title or slug before saving.`);
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    setSaveError('');
    try {
      await saveUpdate(toSave);
      setUpdates((prev) => prev.map((u) => (u.id === toSave.id ? toSave : u)));
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(toSave.id);
        return next;
      });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      const msg = err instanceof Error ? err.message : 'Could not save.';
      // Surface a friendly duplicate-slug message
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setSaveError(`Slug "${toSave.slug}" is already used by another update. Please change it.`);
      } else {
        setSaveError(msg);
      }
    }
  };

  const handleDeleteRequest = (update: Update) => setConfirmDelete(update);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    setSaveError('');
    try {
      await deleteUpdate(target.id);
      setUpdates((prev) => prev.filter((u) => u.id !== target.id));
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      setSaveStatus('idle');
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Could not delete update.');
    }
  };

  const publishedCount = updates.filter((u) => u.published).length;

  return (
    <>
      <section className="admin-card">
        <div className="admin-section-title">
          <h2>Updates</h2>
          <span>
            {publishedCount} of {updates.length} published
          </span>
        </div>

        {saveStatus === 'error' && saveError && (
          <p className="admin-error" style={{ margin: '0 0 16px' }}>{saveError}</p>
        )}
        {saveStatus === 'saved' && !saveError && (
          <p className="admin-muted" style={{ margin: '0 0 16px', fontWeight: 700 }}>Saved.</p>
        )}

        <div className="past-editor-actions">
          <button type="button" className="admin-add" onClick={handleAdd}>
            + Add update
          </button>
        </div>

        {loading && <p className="admin-muted" style={{ marginTop: 16 }}>Loading updates…</p>}

        {!loading && updates.length === 0 && (
          <p className="admin-muted" style={{ marginTop: 16 }}>
            No updates yet. Add one above.
          </p>
        )}

        <div className="past-editor-list" style={{ marginTop: 16 }}>
          {updates.map((update) => (
            <div key={update.id} className="update-editor-wrap">
              <UpdateEditor
                update={update}
                isOpen={openIds.has(update.id)}
                onToggle={() => toggle(update.id)}
                onUpdate={handleUpdate}
                onDeleteRequest={handleDeleteRequest}
                saving={saveStatus === 'saving'}
              />
              {dirtyIds.has(update.id) && (
                <div className="update-editor-save-row">
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ minHeight: 40, padding: '8px 18px', fontSize: '0.95rem' }}
                    onClick={() => handleSave(update)}
                    disabled={saveStatus === 'saving'}
                  >
                    {saveStatus === 'saving' ? 'Saving…' : 'Save this update'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete update?"
        message={
          confirmDelete
            ? `This will permanently delete "${confirmDelete.title || 'this update'}". This cannot be undone.`
            : ''
        }
        confirmLabel="Delete update"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
