import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fallbackContent, instagramHandle } from '../data/content';
import { deletePastShow, loadContent, saveContent } from '../lib/contentApi';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { PastShow, SiteContent } from '../types/content';
import { MotifStack } from '../components/MotifStack';

type SaveState = 'idle' | 'saving' | 'saved';

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
  });

  return errors;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="admin-field">
      <span>
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
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
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
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
  const update = (index: number, value: string) => {
    onChange(artists.map((artist, artistIndex) => (artistIndex === index ? value : artist)));
  };

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
          <input value={artist} onChange={(event) => update(index, event.target.value)} aria-label={`${label} ${index + 1}`} />
          <button type="button" className="admin-mini-btn admin-mini-btn--ghost" onClick={() => onChange(artists.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

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
          <p className="admin-error">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.</p>
        )}
        <form onSubmit={submit} className="admin-form">
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <Field label="Password" value={password} onChange={setPassword} type="password" required />
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" className="btn btn--primary admin-submit" disabled={!hasSupabaseConfig || loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

export function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [content, setContent] = useState<SiteContent>(fallbackContent);
  const [sourceNote, setSourceNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');

  const visibleCount = useMemo(() => content.pastShows.filter((show) => show.visible).length, [content.pastShows]);

  const refreshContent = async () => {
    setLoading(true);
    setError('');
    const result = await loadContent(true);
    setContent(result.content);
    setSourceNote(result.source === 'fallback' ? result.error || 'Showing fallback content.' : 'Loaded from Supabase.');
    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      refreshContent();
    }
  }, [session]);

  const updateContent = (updater: (draft: SiteContent) => SiteContent) => {
    setContent((current) => updater(current));
    setSaveState('idle');
  };

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
          artists: content.upcomingShow.artists.map((artist) => artist.trim()).filter(Boolean),
        },
        pastShows: content.pastShows.map((show) => ({
          ...show,
          artists: show.artists.map((artist) => artist.trim()).filter(Boolean),
        })),
      };
      await saveContent(cleaned);
      setContent(cleaned);
      setSaveState('saved');
      setSourceNote('Saved to Supabase.');
    } catch (saveError) {
      setSaveState('idle');
      setError(saveError instanceof Error ? saveError.message : 'Could not save content.');
    }
  };

  const removePastShow = async (show: PastShow) => {
    if (!window.confirm(`Delete ${show.volume || 'this past show'}? This cannot be undone.`)) return;
    setError('');
    try {
      if (supabase) await deletePastShow(show.id);
      updateContent((current) => ({ ...current, pastShows: current.pastShows.filter((item) => item.id !== show.id) }));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this past show.');
    }
  };

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

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <div>
          <a href="/" className="admin-back">
            ← Back to site
          </a>
          <h1 className="display">Open Walls Admin</h1>
          <p>{loading ? 'Loading content...' : sourceNote}</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn btn--ghost" onClick={refreshContent} disabled={loading || saveState === 'saving'}>
            Reload
          </button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save changes'}
          </button>
          <button type="button" className="admin-mini-btn" onClick={() => supabase?.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {error && <div className="admin-error admin-error--bar">{error}</div>}

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
            onChange={(siteName) => updateContent((current) => ({ ...current, settings: { ...current.settings, siteName } }))}
          />
          <Field
            label="Tagline"
            value={content.settings.tagline}
            onChange={(tagline) => updateContent((current) => ({ ...current, settings: { ...current.settings, tagline } }))}
          />
          <Field
            label="Hero title"
            value={content.settings.heroTitle}
            required
            onChange={(heroTitle) => updateContent((current) => ({ ...current, settings: { ...current.settings, heroTitle } }))}
          />
          <TextArea
            label="Hero body"
            value={content.settings.heroBody}
            required
            rows={4}
            onChange={(heroBody) => updateContent((current) => ({ ...current, settings: { ...current.settings, heroBody } }))}
          />
          <Field
            label="About title"
            value={content.settings.aboutTitle}
            required
            onChange={(aboutTitle) => updateContent((current) => ({ ...current, settings: { ...current.settings, aboutTitle } }))}
          />
          <TextArea
            label="About body"
            value={content.settings.aboutBody}
            rows={7}
            onChange={(aboutBody) => updateContent((current) => ({ ...current, settings: { ...current.settings, aboutBody } }))}
          />
          <TextArea
            label="Footer text"
            value={content.settings.footerText}
            rows={2}
            onChange={(footerText) => updateContent((current) => ({ ...current, settings: { ...current.settings, footerText } }))}
          />
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-section-title">
          <h2>Upcoming Show</h2>
          <span>Main event details and artist lineup</span>
        </div>
        <div className="admin-grid">
          <Field
            label="Volume"
            value={content.upcomingShow.volume}
            required
            onChange={(volume) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, volume } }))}
          />
          <Field
            label="Date"
            value={content.upcomingShow.date}
            required
            onChange={(date) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, date } }))}
          />
          <Field
            label="Time"
            value={content.upcomingShow.time}
            required
            onChange={(time) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, time } }))}
          />
          <Field
            label="Venue"
            value={content.upcomingShow.venue}
            required
            onChange={(venue) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, venue } }))}
          />
          <Field
            label="Location / street"
            value={content.upcomingShow.location}
            onChange={(location) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, location } }))}
          />
          <Field
            label="CTA label"
            value={content.upcomingShow.ctaLabel}
            onChange={(ctaLabel) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, ctaLabel } }))}
          />
          <TextArea
            label="Description"
            value={content.upcomingShow.description}
            rows={4}
            onChange={(description) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, description } }))}
          />
          <TextArea
            label="CTA email subject"
            value={content.upcomingShow.ctaEmailSubject}
            rows={2}
            onChange={(ctaEmailSubject) =>
              updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, ctaEmailSubject } }))
            }
          />
          <TextArea
            label="CTA email body"
            value={content.upcomingShow.ctaEmailBody}
            rows={3}
            onChange={(ctaEmailBody) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, ctaEmailBody } }))}
          />
          <label className="admin-check">
            <input
              type="checkbox"
              checked={content.upcomingShow.freeEntry}
              onChange={(event) =>
                updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, freeEntry: event.target.checked } }))
              }
            />
            Free entry badge
          </label>
        </div>
        <ArtistsEditor
          artists={content.upcomingShow.artists}
          onChange={(artists) => updateContent((current) => ({ ...current, upcomingShow: { ...current.upcomingShow, artists } }))}
          label="Upcoming artists"
        />
      </section>

      <section className="admin-card">
        <div className="admin-section-title">
          <h2>Past Shows</h2>
          <span>{visibleCount} visible shows</span>
        </div>
        <button
          type="button"
          className="admin-add"
          onClick={() =>
            updateContent((current) => ({
              ...current,
              pastShows: [blankPastShow((current.pastShows.length + 1) * 10), ...current.pastShows],
            }))
          }
        >
          Add past show
        </button>
        <div className="past-editor-list">
          {content.pastShows.map((show) => (
            <article className="past-editor" key={show.id}>
              <div className="past-editor__head">
                <strong>{show.volume || 'New past show'}</strong>
                <div>
                  <label className="admin-check admin-check--inline">
                    <input
                      type="checkbox"
                      checked={show.visible}
                      onChange={(event) =>
                        updateContent((current) => ({
                          ...current,
                          pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, visible: event.target.checked } : item)),
                        }))
                      }
                    />
                    Visible
                  </label>
                  <button type="button" className="admin-mini-btn admin-mini-btn--danger" onClick={() => removePastShow(show)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="admin-grid">
                <Field
                  label="Volume"
                  value={show.volume}
                  required
                  onChange={(volume) =>
                    updateContent((current) => ({
                      ...current,
                      pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, volume } : item)),
                    }))
                  }
                />
                <Field
                  label="Date"
                  value={show.date}
                  required
                  onChange={(date) =>
                    updateContent((current) => ({
                      ...current,
                      pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, date } : item)),
                    }))
                  }
                />
                <Field
                  label="Venue"
                  value={show.venue}
                  required
                  onChange={(venue) =>
                    updateContent((current) => ({
                      ...current,
                      pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, venue } : item)),
                    }))
                  }
                />
                <Field
                  label="Location"
                  value={show.location}
                  onChange={(location) =>
                    updateContent((current) => ({
                      ...current,
                      pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, location } : item)),
                    }))
                  }
                />
                <Field
                  label="Display order"
                  type="number"
                  value={show.displayOrder}
                  onChange={(displayOrder) =>
                    updateContent((current) => ({
                      ...current,
                      pastShows: current.pastShows.map((item) =>
                        item.id === show.id ? { ...item, displayOrder: Number(displayOrder) || 0 } : item,
                      ),
                    }))
                  }
                />
                <Field
                  label="Accent color"
                  type="color"
                  value={show.accent}
                  onChange={(accent) =>
                    updateContent((current) => ({
                      ...current,
                      pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, accent } : item)),
                    }))
                  }
                />
                <TextArea
                  label="Notes"
                  value={show.notes}
                  rows={3}
                  onChange={(notes) =>
                    updateContent((current) => ({
                      ...current,
                      pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, notes } : item)),
                    }))
                  }
                />
              </div>
              <ArtistsEditor
                artists={show.artists}
                label="Past show artists"
                onChange={(artists) =>
                  updateContent((current) => ({
                    ...current,
                    pastShows: current.pastShows.map((item) => (item.id === show.id ? { ...item, artists } : item)),
                  }))
                }
              />
            </article>
          ))}
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
            onChange={(contactEmail) => updateContent((current) => ({ ...current, settings: { ...current.settings, contactEmail } }))}
          />
          <Field
            label="Instagram URL"
            value={content.settings.instagramUrl}
            onChange={(instagramUrl) => updateContent((current) => ({ ...current, settings: { ...current.settings, instagramUrl } }))}
          />
        </div>
      </section>
    </main>
  );
}
