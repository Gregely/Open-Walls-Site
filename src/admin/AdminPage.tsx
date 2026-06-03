import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fallbackContent, instagramHandle } from '../data/content';
import { deletePastShow, loadContent, saveContent } from '../lib/contentApi';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { ArtistPromo, ArtistPromoImage, EventPhoto, PastShow, SiteContent } from '../types/content';
import { MotifStack } from '../components/MotifStack';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { resolveImageUrl, isValidPosterUrl } from '../lib/imageUrl';
import { ApplicationsSection } from './ApplicationsSection';
import { UpdatesSection } from './UpdatesSection';

// ── Types ─────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved';
type AdminTab = 'applications' | 'site-content' | 'upcoming' | 'past-shows' | 'updates';

const VALID_TABS: AdminTab[] = ['applications', 'site-content', 'upcoming', 'past-shows', 'updates'];

function getTabFromHash(): AdminTab {
  const hash = window.location.hash.slice(1) as AdminTab;
  return VALID_TABS.includes(hash) ? hash : 'applications';
}

// ── Data helpers ──────────────────────────────────────────────────────────

const blankPastShow = (displayOrder: number): PastShow => ({
  id: crypto.randomUUID(),
  volume: '',
  date: '',
  venue: '',
  location: '',
  artists: [],
  notes: '',
  displayOrder,
  visible: true,
  accent: '#d94f2b',
  seed: Math.floor(Math.random() * 900) + 100,
  posterImageUrl: '',
  artistPromos: [],
  eventPhotos: [],
});

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateContent(content: SiteContent) {
  const errors: string[] = [];
  if (!content.settings.siteName.trim()) errors.push('Site name is required.');
  if (!content.settings.heroTitle.trim()) errors.push('Hero title is required.');
  if (!content.settings.heroBody.trim()) errors.push('Hero body is required.');
  if (!content.settings.aboutTitle.trim()) errors.push('About title is required.');
  if (!content.settings.contactEmail.trim() || !isEmail(content.settings.contactEmail)) {
    errors.push('Contact email must be a valid email address.');
  }
  if (!content.upcomingShow.volume.trim()) errors.push('Upcoming show volume is required.');
  if (!content.upcomingShow.date.trim()) errors.push('Upcoming show date is required.');
  if (!content.upcomingShow.time.trim()) errors.push('Upcoming show time is required.');
  if (!content.upcomingShow.venue.trim()) errors.push('Upcoming show venue is required.');
  content.pastShows.forEach((show, index) => {
    const label = show.volume || `Past show ${index + 1}`;
    if (!show.volume.trim()) errors.push(`${label}: volume is required.`);
    if (!show.date.trim()) errors.push(`${label}: date is required.`);
    if (!show.venue.trim()) errors.push(`${label}: venue is required.`);
    if (!isValidPosterUrl(show.posterImageUrl)) {
      errors.push(`${label}: poster image URL must be a valid https:// URL or left empty.`);
    }
  });
  return errors;
}

// ── Form field components ─────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="admin-field">
      <span>
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
      {hint && <span className="admin-field__hint">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="admin-field admin-field--wide">
      <span>
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

function ArtistsEditor({
  artists,
  onChange,
  label = 'Artists',
}: {
  artists: string[];
  onChange: (artists: string[]) => void;
  label?: string;
}) {
  const update = (index: number, value: string) =>
    onChange(artists.map((a, i) => (i === index ? value : a)));

  return (
    <div className="artists-editor">
      <div className="admin-subhead">
        <span>{label}</span>
        <button type="button" className="admin-mini-btn" onClick={() => onChange([...artists, ''])}>
          Add artist
        </button>
      </div>
      {artists.length === 0 && <p className="admin-muted">No artists added yet.</p>}
      {artists.map((artist, index) => (
        <div className="artist-row" key={`${artist}-${index}`}>
          <input
            value={artist}
            onChange={(e) => update(index, e.target.value)}
            aria-label={`${label} ${index + 1}`}
          />
          <button
            type="button"
            className="admin-mini-btn admin-mini-btn--ghost"
            onClick={() => onChange(artists.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Archive media editors ─────────────────────────────────────────────────

function PromoEntryEditor({
  promo,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
}: {
  promo: ArtistPromo;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: ArtistPromo) => void;
  onRemove: () => void;
}) {
  const patch = (updates: Partial<ArtistPromo>) => onUpdate({ ...promo, ...updates });

  const addImage = () =>
    patch({
      images: [...promo.images, { id: crypto.randomUUID(), url: '', caption: '', alt: '' }],
    });

  const updateImage = (id: string, updates: Partial<ArtistPromoImage>) =>
    patch({ images: promo.images.map((img) => (img.id === id ? { ...img, ...updates } : img)) });

  const removeImage = (id: string) =>
    patch({ images: promo.images.filter((img) => img.id !== id) });

  return (
    <article className={`archive-entry${isOpen ? ' archive-entry--open' : ''}`}>
      <button type="button" className="archive-entry__toggle" onClick={onToggle} aria-expanded={isOpen}>
        <span>{promo.artistName || 'New artist promo'}</span>
        <span className="archive-entry__chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="archive-entry__content">
          <div className="admin-grid">
            <Field label="Artist name" value={promo.artistName} onChange={(v) => patch({ artistName: v })} />
            <Field label="Instagram / social URL" value={promo.socialUrl} onChange={(v) => patch({ socialUrl: v })} />
            <Field
              label="Display order"
              type="number"
              value={promo.displayOrder}
              onChange={(v) => patch({ displayOrder: Number(v) || 0 })}
            />
            <TextArea label="Description / caption" value={promo.description} rows={3} onChange={(v) => patch({ description: v })} />
          </div>
          <label className="admin-check" style={{ margin: '10px 0 14px' }}>
            <input type="checkbox" checked={promo.visible} onChange={(e) => patch({ visible: e.target.checked })} />
            Visible
          </label>
          <div className="archive-images-editor">
            <div className="archive-editor__head">
              <span className="archive-editor__label" style={{ fontSize: '0.85rem' }}>Images</span>
              <button type="button" className="admin-mini-btn" onClick={addImage}>+ Add image</button>
            </div>
            {promo.images.length === 0 && <p className="admin-muted">No images yet.</p>}
            {promo.images.map((img) => (
              <div key={img.id} className="archive-image-row">
                <div className="archive-image-row__fields">
                  <Field
                    label="Image URL"
                    value={img.url}
                    hint='Direct image URL or public Google Drive share link ("Anyone with the link can view")'
                    onChange={(v) => updateImage(img.id, { url: v })}
                  />
                  <Field label="Caption" value={img.caption} onChange={(v) => updateImage(img.id, { caption: v })} />
                  <Field label="Alt text" value={img.alt} onChange={(v) => updateImage(img.id, { alt: v })} />
                </div>
                {img.url && (
                  <div className="archive-img-preview">
                    <img
                      src={resolveImageUrl(img.url)}
                      alt={img.alt || 'Preview'}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      onLoad={(e) => { e.currentTarget.style.display = ''; }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="admin-mini-btn admin-mini-btn--ghost"
                  style={{ marginTop: 4 }}
                  onClick={() => removeImage(img.id)}
                >
                  Remove image
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="button" className="admin-mini-btn admin-mini-btn--danger" onClick={onRemove}>
              Delete artist promo
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function ArtistPromoEditor({
  promos,
  onChange,
}: {
  promos: ArtistPromo[];
  onChange: (promos: ArtistPromo[]) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const addPromo = () => {
    const newPromo: ArtistPromo = {
      id: crypto.randomUUID(),
      artistName: '',
      socialUrl: '',
      description: '',
      images: [],
      visible: true,
      displayOrder: (promos.length + 1) * 10,
    };
    onChange([...promos, newPromo]);
    setOpenIds((prev) => new Set([...prev, newPromo.id]));
  };

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="archive-editor">
      <div className="archive-editor__head">
        <span className="archive-editor__label">Artist Promos</span>
        <button type="button" className="admin-mini-btn" onClick={addPromo}>+ Add promo</button>
      </div>
      {promos.length === 0 && <p className="admin-muted">No artist promos yet.</p>}
      {promos.map((promo) => (
        <PromoEntryEditor
          key={promo.id}
          promo={promo}
          isOpen={openIds.has(promo.id)}
          onToggle={() => toggle(promo.id)}
          onUpdate={(updated) => onChange(promos.map((p) => (p.id === updated.id ? updated : p)))}
          onRemove={() => onChange(promos.filter((p) => p.id !== promo.id))}
        />
      ))}
    </div>
  );
}

function EventPhotoEditor({
  photos,
  onChange,
}: {
  photos: EventPhoto[];
  onChange: (photos: EventPhoto[]) => void;
}) {
  const addPhoto = () => {
    const newPhoto: EventPhoto = {
      id: crypto.randomUUID(),
      url: '',
      caption: '',
      credit: '',
      alt: '',
      visible: true,
      displayOrder: (photos.length + 1) * 10,
    };
    onChange([...photos, newPhoto]);
  };

  const update = (updated: EventPhoto) =>
    onChange(photos.map((p) => (p.id === updated.id ? updated : p)));

  return (
    <div className="archive-editor" style={{ marginTop: 20 }}>
      <div className="archive-editor__head">
        <span className="archive-editor__label">Event Photos</span>
        <button type="button" className="admin-mini-btn" onClick={addPhoto}>+ Add photo</button>
      </div>
      {photos.length === 0 && <p className="admin-muted">No event photos yet.</p>}
      {photos.map((photo) => (
        <div key={photo.id} className="event-photo-row">
          <div className="admin-grid">
            <Field
              label="Image URL"
              value={photo.url}
              hint='Direct image URL or public Google Drive share link ("Anyone with the link can view")'
              onChange={(v) => update({ ...photo, url: v })}
            />
            <Field label="Caption" value={photo.caption} onChange={(v) => update({ ...photo, caption: v })} />
            <Field label="Photographer credit" value={photo.credit} onChange={(v) => update({ ...photo, credit: v })} />
            <Field label="Alt text" value={photo.alt} onChange={(v) => update({ ...photo, alt: v })} />
            <Field
              label="Display order"
              type="number"
              value={photo.displayOrder}
              onChange={(v) => update({ ...photo, displayOrder: Number(v) || 0 })}
            />
          </div>
          <div className="event-photo-row__foot">
            <label className="admin-check">
              <input type="checkbox" checked={photo.visible} onChange={(e) => update({ ...photo, visible: e.target.checked })} />
              Visible
            </label>
            {photo.url && (
              <div className="archive-img-preview">
                <img
                  src={resolveImageUrl(photo.url)}
                  alt={photo.alt || 'Preview'}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onLoad={(e) => { e.currentTarget.style.display = ''; }}
                />
              </div>
            )}
            <button
              type="button"
              className="admin-mini-btn admin-mini-btn--danger"
              onClick={() => onChange(photos.filter((p) => p.id !== photo.id))}
            >
              Remove photo
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SaveBar ───────────────────────────────────────────────────────────────
// Bottom save affordance for long content tabs.

function SaveBar({
  saveState,
  loading,
  isDirty,
  onSave,
  lastSaved,
}: {
  saveState: SaveState;
  loading: boolean;
  isDirty: boolean;
  onSave: () => void;
  lastSaved: Date | null;
}) {
  let note = '';
  if (saveState === 'saving') note = 'Saving…';
  else if (isDirty) note = '● Unsaved changes';
  else if (saveState === 'saved' && lastSaved)
    note = `Saved at ${lastSaved.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="admin-save-bar">
      <span className="admin-save-bar__note">{note}</span>
      <button
        type="button"
        className="btn btn--primary admin-save-bar__btn"
        onClick={onSave}
        disabled={saveState === 'saving' || loading}
      >
        {saveState === 'saving' ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ── CollapsiblePastShowEditor ─────────────────────────────────────────────

function CollapsiblePastShowEditor({
  show,
  isOpen,
  onToggle,
  onUpdate,
  onDeleteRequest,
}: {
  show: PastShow;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: PastShow) => void;
  onDeleteRequest: (show: PastShow) => void;
}) {
  const patch = (updates: Partial<PastShow>) => onUpdate({ ...show, ...updates });
  const [showArchive, setShowArchive] = useState(false);

  return (
    <article className={`past-editor past-editor--collapsible${isOpen ? ' past-editor--open' : ''}`}>
      <button
        type="button"
        className="past-editor__toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="past-editor__summary">
          <strong className="past-editor__summary-vol">{show.volume || 'New past show'}</strong>
          {show.date && <span className="past-editor__summary-meta">{show.date}</span>}
          {show.venue && <span className="past-editor__summary-meta">{show.venue}</span>}
          {!show.visible && <span className="past-editor__badge">Hidden</span>}
        </span>
        <span className="past-editor__chevron" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="past-editor__content">
          <div className="admin-grid">
            <Field
              label="Volume"
              value={show.volume}
              required
              onChange={(v) => patch({ volume: v })}
            />
            <Field
              label="Date"
              value={show.date}
              required
              onChange={(v) => patch({ date: v })}
            />
            <Field
              label="Venue"
              value={show.venue}
              required
              onChange={(v) => patch({ venue: v })}
            />
            <Field
              label="Location"
              value={show.location}
              onChange={(v) => patch({ location: v })}
            />
            <Field
              label="Display order"
              type="number"
              value={show.displayOrder}
              onChange={(v) => patch({ displayOrder: Number(v) || 0 })}
            />
            <Field
              label="Accent color"
              type="color"
              value={show.accent}
              onChange={(v) => patch({ accent: v })}
            />
            <TextArea
              label="Notes"
              value={show.notes}
              rows={3}
              onChange={(v) => patch({ notes: v })}
            />
            <Field
              label="Poster image URL"
              value={show.posterImageUrl}
              hint={'Paste a public Google Drive sharing link or direct image URL. File must be shared as "Anyone with the link can view". Recommended size: 1080 × 1350 px (4:5 portrait).'}
              onChange={(v) => patch({ posterImageUrl: v })}
            />
          </div>

          <div className="past-editor__footer">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={show.visible}
                onChange={(e) => patch({ visible: e.target.checked })}
              />
              Visible on public site
            </label>

            <ArtistsEditor
              artists={show.artists}
              label="Artists"
              onChange={(v) => patch({ artists: v })}
            />

            {show.posterImageUrl && (
              <div className="admin-poster-preview-wrap">
                <span className="admin-muted">Poster preview</span>
                <img
                  key={show.posterImageUrl}
                  src={resolveImageUrl(show.posterImageUrl)}
                  alt={`Poster for ${show.volume || 'this show'}`}
                  className="admin-poster-preview"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = '';
                  }}
                />
              </div>
            )}

            <div className="archive-media-section">
              <button
                type="button"
                className="archive-media-toggle"
                onClick={() => setShowArchive((prev) => !prev)}
                aria-expanded={showArchive}
              >
                <span>Archive Media</span>
                <span aria-hidden="true">{showArchive ? '▲' : '▼'}</span>
              </button>
              {showArchive && (
                <>
                  <ArtistPromoEditor
                    promos={show.artistPromos}
                    onChange={(v) => patch({ artistPromos: v })}
                  />
                  <EventPhotoEditor
                    photos={show.eventPhotos}
                    onChange={(v) => patch({ eventPhotos: v })}
                  />
                </>
              )}
            </div>

            <div className="past-editor__delete-row">
              <button
                type="button"
                className="admin-mini-btn admin-mini-btn--danger"
                onClick={() => onDeleteRequest(show)}
              >
                Delete this show
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ── PastShowsPanel ────────────────────────────────────────────────────────

function PastShowsPanel({
  shows,
  onAdd,
  onUpdate,
  onDeleteRequest,
  saveState,
  loading,
  isDirty,
  onSave,
  lastSaved,
}: {
  shows: PastShow[];
  onAdd: () => void;
  onUpdate: (updated: PastShow) => void;
  onDeleteRequest: (show: PastShow) => void;
  saveState: SaveState;
  loading: boolean;
  isDirty: boolean;
  onSave: () => void;
  lastSaved: Date | null;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const prevLength = useRef(shows.length);

  // Auto-expand a newly added show (new shows are prepended)
  useEffect(() => {
    if (shows.length > prevLength.current && shows.length > 0) {
      setOpenIds((prev) => new Set([...prev, shows[0].id]));
    }
    prevLength.current = shows.length;
  // We only care about length changes, not individual field changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shows.length]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandAll = () => setOpenIds(new Set(shows.map((s) => s.id)));
  const collapseAll = () => setOpenIds(new Set());

  const visibleCount = shows.filter((s) => s.visible).length;

  return (
    <>
      <section className="admin-card">
        <div className="admin-section-title">
          <h2>Past Shows</h2>
          <span>
            {visibleCount} of {shows.length} visible
          </span>
        </div>

        <div className="past-editor-actions">
          <button type="button" className="admin-add" onClick={onAdd}>
            + Add past show
          </button>
          <div className="past-editor-bulk-actions">
            <button
              type="button"
              className="admin-mini-btn admin-mini-btn--ghost"
              onClick={expandAll}
              disabled={shows.length === 0}
            >
              Expand all
            </button>
            <button
              type="button"
              className="admin-mini-btn admin-mini-btn--ghost"
              onClick={collapseAll}
              disabled={openIds.size === 0}
            >
              Collapse all
            </button>
          </div>
        </div>

        {shows.length === 0 && (
          <p className="admin-muted" style={{ marginTop: '16px' }}>
            No past shows yet. Add one above.
          </p>
        )}

        <div className="past-editor-list">
          {shows.map((show) => (
            <CollapsiblePastShowEditor
              key={show.id}
              show={show}
              isOpen={openIds.has(show.id)}
              onToggle={() => toggle(show.id)}
              onUpdate={onUpdate}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      </section>

      <SaveBar
        saveState={saveState}
        loading={loading}
        isDirty={isDirty}
        onSave={onSave}
        lastSaved={lastSaved}
      />
    </>
  );
}

// ── AdminTabBar ───────────────────────────────────────────────────────────

function AdminTabBar({
  activeTab,
  onSwitch,
  appNewCount,
  showCount,
}: {
  activeTab: AdminTab;
  onSwitch: (tab: AdminTab) => void;
  appNewCount: number;
  showCount: number;
}) {
  const tabs: { id: AdminTab; label: string }[] = [
    {
      id: 'applications',
      label: appNewCount > 0 ? `Applications (${appNewCount} new)` : 'Applications',
    },
    { id: 'site-content', label: 'Site Content' },
    { id: 'upcoming', label: 'Upcoming Show' },
    {
      id: 'past-shows',
      label: showCount > 0 ? `Past Shows (${showCount})` : 'Past Shows',
    },
    { id: 'updates', label: 'Updates' },
  ];

  return (
    <div className="admin-tab-bar-wrap">
      <div className="admin-tab-bar" role="tablist" aria-label="Admin sections">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={activeTab === id}
            className={`admin-tab${activeTab === id ? ' admin-tab--active' : ''}`}
            onClick={() => onSwitch(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── LoginScreen ───────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onLogin();
  };

  return (
    <main className="admin-shell admin-shell--login">
      <section className="admin-login">
        <MotifStack size={76} seed={88} layers={4} jitter={6} />
        <h1 className="display">Open Walls Admin</h1>
        {!hasSupabaseConfig && (
          <p className="admin-error">
            Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.
          </p>
        )}
        <form onSubmit={submit} className="admin-form">
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <Field label="Password" value={password} onChange={setPassword} type="password" required />
          {error && <p className="admin-error">{error}</p>}
          <button
            type="submit"
            className="btn btn--primary admin-submit"
            disabled={!hasSupabaseConfig || loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

// ── AdminPage ─────────────────────────────────────────────────────────────

export function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [content, setContent] = useState<SiteContent>(fallbackContent);
  const [sourceNote, setSourceNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>(getTabFromHash);
  const [appNewCount, setAppNewCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<PastShow | null>(null);
  const [confirmReload, setConfirmReload] = useState(false);

  // Mutable ref that always reflects the current dirty status — safe to read
  // inside async callbacks and event handlers without stale-closure risk.
  const isDirtyRef = useRef(false);

  const markDirty = () => {
    isDirtyRef.current = true;
    setIsDirty(true);
    setSaveState('idle');
  };

  const markClean = () => {
    isDirtyRef.current = false;
    setIsDirty(false);
  };

  const switchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // ── Data loading ──────────────────────────────────────────────────────

  // force=true skips the dirty guard (used by the explicit Reload button after confirmation).
  // force=false (default) silently exits if the user has unsaved edits, so auth events
  // and automatic callbacks can never overwrite draft content.
  const refreshContent = async (force = false) => {
    if (!force && isDirtyRef.current) return;
    setLoading(true);
    setError('');
    const result = await loadContent(true);
    setContent(result.content);
    markClean();
    setSourceNote(
      result.source === 'fallback'
        ? result.error || 'Showing fallback content.'
        : 'Loaded from Supabase.',
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    // Load content for users who are already logged in when the page opens
    // (e.g. refreshing /admin while a session is still active).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) {
        refreshContent();
      }
    });

    const { data: authData } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      // Do NOT call refreshContent here under any event.
      //
      // SIGNED_IN fires not only on explicit password entry but also whenever
      // Supabase re-establishes the session after a tab regains focus (the access
      // token was refreshed in the background). Calling refreshContent() here
      // overwrites the admin's unsaved draft.
      //
      // Content loading is fully covered by:
      //   • getSession() above — loads content when the page opens with a live session
      //   • LoginScreen onLogin callback — loads content after an explicit sign-in
      //
      // TOKEN_REFRESHED, USER_UPDATED, SIGNED_OUT, INITIAL_SESSION:
      //   none of these should trigger a content reload.
    });

    return () => authData.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Content updates ───────────────────────────────────────────────────

  const updateContent = (updater: (draft: SiteContent) => SiteContent) => {
    setContent((current) => updater(current));
    markDirty();
  };

  const handlePastShowUpdate = (updated: PastShow) => {
    updateContent((c) => ({
      ...c,
      pastShows: c.pastShows.map((item) => (item.id === updated.id ? updated : item)),
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────────

  const save = async () => {
    const errors = validateContent(content);
    if (errors.length) {
      setError(errors.join(' '));
      return;
    }
    setSaveState('saving');
    setError('');
    try {
      const cleaned: SiteContent = {
        settings: content.settings,
        upcomingShow: {
          ...content.upcomingShow,
          artists: content.upcomingShow.artists.map((a) => a.trim()).filter(Boolean),
        },
        pastShows: content.pastShows.map((show) => ({
          ...show,
          artists: show.artists.map((a) => a.trim()).filter(Boolean),
        })),
      };
      await saveContent(cleaned);
      setContent(cleaned);
      setSaveState('saved');
      markClean();
      setLastSaved(new Date());
      setSourceNote('Saved to Supabase.');
    } catch (saveError) {
      setSaveState('idle');
      setError(saveError instanceof Error ? saveError.message : 'Could not save content.');
    }
  };

  // ── Delete (past shows) ───────────────────────────────────────────────

  const requestDeletePastShow = (show: PastShow) => setConfirmDelete(show);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const show = confirmDelete;
    setConfirmDelete(null);
    setError('');
    try {
      if (supabase) await deletePastShow(show.id);
      updateContent((c) => ({
        ...c,
        pastShows: c.pastShows.filter((item) => item.id !== show.id),
      }));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Could not delete this past show.',
      );
    }
  };

  // ── Reload (with dirty guard) ─────────────────────────────────────────

  const handleReload = () => {
    if (isDirtyRef.current) {
      setConfirmReload(true);
    } else {
      refreshContent(true);
    }
  };

  // ── beforeunload ──────────────────────────────────────────────────────
  // Warn before leaving the page when there are unsaved edits.
  // isDirtyRef is used (not isDirty state) so the handler always reads the
  // current value without being re-registered on every dirty/clean transition.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth guards ───────────────────────────────────────────────────────

  if (!authReady) {
    return (
      <main className="admin-shell">
        <div className="admin-status">Checking admin session...</div>
      </main>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={refreshContent} />;
  }

  // ── Render ────────────────────────────────────────────────────────────

  // Updates has its own per-item save; Applications has no save. Only show
  // the top-header Reload/Save buttons for the three content-editing tabs.
  const isContentTab = activeTab === 'site-content' || activeTab === 'upcoming' || activeTab === 'past-shows';

  // Button label for the top-header save button
  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : isDirty
      ? '● Save changes'
      : saveState === 'saved'
      ? 'Saved ✓'
      : 'Save changes';

  return (
    <main className="admin-shell">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="admin-top">
        <div>
          <a href="/" className="admin-back">
            ← Back to site
          </a>
          <h1 className="display">Open Walls Admin</h1>
          <p className="admin-top__note">{loading ? 'Loading content…' : sourceNote}</p>
        </div>
        <div className="admin-actions">
          {isContentTab && (
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleReload}
                disabled={loading || saveState === 'saving'}
              >
                Reload
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={save}
                disabled={saveState === 'saving'}
              >
                {saveLabel}
              </button>
            </>
          )}
          <button
            type="button"
            className="admin-mini-btn"
            onClick={() => supabase?.auth.signOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Tab bar (sticky) ────────────────────────────────────────── */}
      <AdminTabBar
        activeTab={activeTab}
        onSwitch={switchTab}
        appNewCount={appNewCount}
        showCount={content.pastShows.length}
      />

      {/* ── Error bar ───────────────────────────────────────────────── */}
      {error && (
        <div className="admin-error admin-error--bar admin-error--tabbed">{error}</div>
      )}

      {/* ── Applications tab ────────────────────────────────────────── */}
      {activeTab === 'applications' && (
        <ApplicationsSection onNewCount={setAppNewCount} />
      )}

      {/* ── Site Content tab ────────────────────────────────────────── */}
      {activeTab === 'site-content' && (
        <>
          <section className="admin-card">
            <div className="admin-section-title">
              <h2>Site Text</h2>
              <span>Homepage wording and footer copy</span>
            </div>
            <div className="admin-grid">
              <Field
                label="Site name"
                value={content.settings.siteName}
                required
                onChange={(v) => updateContent((c) => ({ ...c, settings: { ...c.settings, siteName: v } }))}
              />
              <Field
                label="Tagline"
                value={content.settings.tagline}
                onChange={(v) => updateContent((c) => ({ ...c, settings: { ...c.settings, tagline: v } }))}
              />
              <Field
                label="Hero title"
                value={content.settings.heroTitle}
                required
                onChange={(v) => updateContent((c) => ({ ...c, settings: { ...c.settings, heroTitle: v } }))}
              />
              <TextArea
                label="Hero body"
                value={content.settings.heroBody}
                required
                rows={4}
                onChange={(v) => updateContent((c) => ({ ...c, settings: { ...c.settings, heroBody: v } }))}
              />
              <Field
                label="About title"
                value={content.settings.aboutTitle}
                required
                onChange={(v) =>
                  updateContent((c) => ({ ...c, settings: { ...c.settings, aboutTitle: v } }))
                }
              />
              <TextArea
                label="About body"
                value={content.settings.aboutBody}
                rows={7}
                onChange={(v) => updateContent((c) => ({ ...c, settings: { ...c.settings, aboutBody: v } }))}
              />
              <TextArea
                label="Footer text"
                value={content.settings.footerText}
                rows={2}
                onChange={(v) =>
                  updateContent((c) => ({ ...c, settings: { ...c.settings, footerText: v } }))
                }
              />
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-section-title">
              <h2>Contact Links</h2>
              <span>{instagramHandle(content.settings.instagramUrl)}</span>
            </div>
            <div className="admin-grid">
              <Field
                label="Contact email"
                value={content.settings.contactEmail}
                type="email"
                required
                onChange={(v) =>
                  updateContent((c) => ({ ...c, settings: { ...c.settings, contactEmail: v } }))
                }
              />
              <Field
                label="Instagram URL"
                value={content.settings.instagramUrl}
                onChange={(v) =>
                  updateContent((c) => ({ ...c, settings: { ...c.settings, instagramUrl: v } }))
                }
              />
            </div>
          </section>

          <SaveBar
            saveState={saveState}
            loading={loading}
            isDirty={isDirty}
            onSave={save}
            lastSaved={lastSaved}
          />
        </>
      )}

      {/* ── Upcoming Show tab ────────────────────────────────────────── */}
      {activeTab === 'upcoming' && (
        <>
          <section className="admin-card">
            <div className="admin-section-title">
              <h2>Upcoming Show</h2>
              <span>Main event details</span>
            </div>
            <div className="admin-grid">
              <Field
                label="Volume"
                value={content.upcomingShow.volume}
                required
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, volume: v } }))
                }
              />
              <Field
                label="Date"
                value={content.upcomingShow.date}
                required
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, date: v } }))
                }
              />
              <Field
                label="Time"
                value={content.upcomingShow.time}
                required
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, time: v } }))
                }
              />
              <Field
                label="Venue"
                value={content.upcomingShow.venue}
                required
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, venue: v } }))
                }
              />
              <Field
                label="Location / street"
                value={content.upcomingShow.location}
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, location: v } }))
                }
              />
              <Field
                label="CTA label"
                value={content.upcomingShow.ctaLabel}
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, ctaLabel: v } }))
                }
              />
              <Field
                label="Find out more — label"
                value={content.upcomingShow.findOutMoreLabel}
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, findOutMoreLabel: v } }))
                }
              />
              <Field
                label="Find out more — URL"
                value={content.upcomingShow.findOutMoreUrl}
                hint="Internal path (e.g. /#about or /updates/vol-20-news) or full external URL (https://…). Leave blank to default to /#about."
                onChange={(v) =>
                  updateContent((c) => ({ ...c, upcomingShow: { ...c.upcomingShow, findOutMoreUrl: v } }))
                }
              />
              <TextArea
                label="Description"
                value={content.upcomingShow.description}
                rows={4}
                onChange={(v) =>
                  updateContent((c) => ({
                    ...c,
                    upcomingShow: { ...c.upcomingShow, description: v },
                  }))
                }
              />
              <TextArea
                label="CTA email subject"
                value={content.upcomingShow.ctaEmailSubject}
                rows={2}
                onChange={(v) =>
                  updateContent((c) => ({
                    ...c,
                    upcomingShow: { ...c.upcomingShow, ctaEmailSubject: v },
                  }))
                }
              />
              <TextArea
                label="CTA email body"
                value={content.upcomingShow.ctaEmailBody}
                rows={3}
                onChange={(v) =>
                  updateContent((c) => ({
                    ...c,
                    upcomingShow: { ...c.upcomingShow, ctaEmailBody: v },
                  }))
                }
              />
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={content.upcomingShow.freeEntry}
                  onChange={(e) =>
                    updateContent((c) => ({
                      ...c,
                      upcomingShow: { ...c.upcomingShow, freeEntry: e.target.checked },
                    }))
                  }
                />
                Free entry badge
              </label>
              <div className="admin-check-with-hint">
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={content.upcomingShow.applicationsOpen}
                    onChange={(e) =>
                      updateContent((c) => ({
                        ...c,
                        upcomingShow: { ...c.upcomingShow, applicationsOpen: e.target.checked },
                      }))
                    }
                  />
                  Applications open
                </label>
                <span className="admin-field__hint">
                  When off, the Apply button appears greyed out and cannot be clicked.
                </span>
              </div>
            </div>
          </section>

          <SaveBar
            saveState={saveState}
            loading={loading}
            isDirty={isDirty}
            onSave={save}
            lastSaved={lastSaved}
          />
        </>
      )}

      {/* ── Past Shows tab ───────────────────────────────────────────── */}
      {activeTab === 'past-shows' && (
        <PastShowsPanel
          shows={content.pastShows}
          onAdd={() =>
            updateContent((c) => ({
              ...c,
              pastShows: [blankPastShow((c.pastShows.length + 1) * 10), ...c.pastShows],
            }))
          }
          onUpdate={handlePastShowUpdate}
          onDeleteRequest={requestDeletePastShow}
          saveState={saveState}
          loading={loading}
          isDirty={isDirty}
          onSave={save}
          lastSaved={lastSaved}
        />
      )}

      {/* ── Updates tab ─────────────────────────────────────────────── */}
      {activeTab === 'updates' && <UpdatesSection />}

      {/* ── Confirm delete past show ─────────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete past show?"
        message={
          confirmDelete
            ? `This will permanently remove ${[confirmDelete.volume, confirmDelete.date, confirmDelete.venue]
                .filter(Boolean)
                .join(' · ')} from the site. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete show"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Confirm discard unsaved changes (Reload) ─────────────────── */}
      <ConfirmDialog
        isOpen={confirmReload}
        title="Discard unsaved changes?"
        message="Reloading will fetch the latest saved content and discard any edits you have not saved yet."
        confirmLabel="Discard and reload"
        cancelLabel="Keep editing"
        onConfirm={() => { setConfirmReload(false); refreshContent(true); }}
        onCancel={() => setConfirmReload(false)}
      />
    </main>
  );
}
