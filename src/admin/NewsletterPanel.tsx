import { useEffect, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import {
  loadNewsletterSettings,
  saveNewsletterSettings,
} from '../lib/newsletterSettingsApi';
import type { NewsletterSettings } from '../types/newsletterSettings';
import { DEFAULT_NEWSLETTER_SETTINGS } from '../types/newsletterSettings';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="admin-field__hint">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 2,
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

export function NewsletterPanel() {
  const [settings, setSettings] = useState<NewsletterSettings>(DEFAULT_NEWSLETTER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNewsletterSettings()
      .then(setSettings)
      .finally(() => setLoading(false));

    // Fetch subscriber count from MailerLite via edge function.
    if (hasSupabaseConfig && supabase) {
      supabase.functions
        .invoke('subscribe', { body: { action: 'stats' } })
        .then(({ data }) => {
          if (data != null && typeof (data as { count: number | null }).count === 'number') {
            setSubscriberCount((data as { count: number }).count);
          }
        })
        .catch(() => {});
    }
  }, []);

  const patch = (updates: Partial<NewsletterSettings>) =>
    setSettings((prev) => ({ ...prev, ...updates }));

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      await saveNewsletterSettings(settings);
      setSaveState('saved');
      setLastSaved(new Date());
    } catch (err) {
      setSaveState('error');
      setSaveError(
        err instanceof Error ? err.message : 'Could not save newsletter settings.',
      );
    }
  };

  let saveLabel = 'Save settings';
  if (saveState === 'saving') saveLabel = 'Saving…';
  else if (saveState === 'saved' && lastSaved)
    saveLabel = `Saved at ${lastSaved.toLocaleTimeString('en-IE', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

  return (
    <section className="admin-card">
      <button
        type="button"
        className="past-editor__toggle"
        style={{ width: '100%', textAlign: 'left' }}
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <span className="past-editor__summary">
          <strong className="past-editor__summary-vol">Newsletter Settings</strong>
          <span className="past-editor__summary-meta">
            {subscriberCount != null
              ? `${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}`
              : 'MailerLite integration'}
          </span>
        </span>
        <span className="past-editor__chevron" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div style={{ paddingTop: 20 }}>
          {loading ? (
            <p className="admin-muted">Loading…</p>
          ) : (
            <>
              {/* Subscriber count */}
              {subscriberCount != null && (
                <div className="newsletter-stat-box">
                  <span className="newsletter-stat-box__label">Subscribers</span>
                  <span className="newsletter-stat-box__count display">
                    {subscriberCount}
                  </span>
                </div>
              )}

              {/* Signup section copy */}
              <div className="admin-section-title" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Signup section copy</h3>
              </div>
              <div className="admin-grid">
                <Field
                  label="Heading"
                  value={settings.heading}
                  onChange={(v) => patch({ heading: v })}
                />
                <TextArea
                  label="Subheading"
                  value={settings.subheading}
                  rows={2}
                  onChange={(v) => patch({ subheading: v })}
                />
                <Field
                  label="Button text"
                  value={settings.buttonText}
                  onChange={(v) => patch({ buttonText: v })}
                />
                <Field
                  label="Disclaimer"
                  value={settings.disclaimer}
                  hint="Shown below the subscribe button."
                  onChange={(v) => patch({ disclaimer: v })}
                />
              </div>

              {/* Response messages */}
              <div
                className="admin-section-title"
                style={{ marginBottom: 12, marginTop: 20 }}
              >
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Response messages</h3>
              </div>
              <div className="admin-grid">
                <TextArea
                  label="Success message"
                  value={settings.successMessage}
                  rows={2}
                  onChange={(v) => patch({ successMessage: v })}
                />
                <TextArea
                  label="Already subscribed message"
                  value={settings.alreadySubscribedMessage}
                  rows={2}
                  onChange={(v) => patch({ alreadySubscribedMessage: v })}
                />
                <TextArea
                  label="Failure message"
                  value={settings.failureMessage}
                  rows={2}
                  onChange={(v) => patch({ failureMessage: v })}
                />
              </div>

              {saveState === 'error' && saveError && (
                <p className="admin-error" style={{ marginTop: 12 }}>
                  {saveError}
                </p>
              )}

              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                >
                  {saveLabel}
                </button>
              </div>

              <p className="admin-muted" style={{ marginTop: 16 }}>
                Manage subscribers, campaigns, and unsubscribes in the{' '}
                <a
                  href="https://dashboard.mailerlite.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--purple)' }}
                >
                  MailerLite dashboard
                </a>
                . MailerLite is the source of truth for subscriber data.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
