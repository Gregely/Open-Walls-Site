import { useEffect, useState } from 'react';
import { loadApplicationSettings, saveApplicationSettings } from '../lib/applicationSettingsApi';
import type { ApplicationFormType, ApplicationSettings } from '../types/applicationSettings';
import { DEFAULT_APPLICATION_SETTINGS } from '../types/applicationSettings';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ── Reusable field helpers (local, mirrors AdminPage style) ───────────────

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

// ── Main component ────────────────────────────────────────────────────────

export function ApplicationSettingsPanel() {
  const [settings, setSettings] = useState<ApplicationSettings>(DEFAULT_APPLICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadApplicationSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const patch = (updates: Partial<ApplicationSettings>) =>
    setSettings((prev) => ({ ...prev, ...updates }));

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      await saveApplicationSettings(settings);
      setSaveState('saved');
      setLastSaved(new Date());
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : 'Could not save application settings.');
    }
  };

  let saveLabel = 'Save settings';
  if (saveState === 'saving') saveLabel = 'Saving…';
  else if (saveState === 'saved' && lastSaved)
    saveLabel = `Saved at ${lastSaved.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}`;
  else if (saveState === 'error') saveLabel = 'Save settings';

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
          <strong className="past-editor__summary-vol">Application Settings</strong>
          <span className="past-editor__summary-meta">
            {loading ? 'Loading…' : `${settings.applicationsOpen ? 'Open' : 'Closed'} · ${settings.activeForm === 'wandesford' ? 'Wandesford Quay form' : 'Default Open Walls form'}`}
          </span>
        </span>
        <span className="past-editor__chevron" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div style={{ paddingTop: 20 }}>
          {loading ? (
            <p className="admin-muted">Loading settings…</p>
          ) : (
            <>
              {/* Open / closed */}
              <div className="admin-section-title" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Form gate</h3>
              </div>
              <div className="admin-check-with-hint" style={{ marginBottom: 20 }}>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={settings.applicationsOpen}
                    onChange={(e) => patch({ applicationsOpen: e.target.checked })}
                  />
                  Applications open
                </label>
                <span className="admin-field__hint">
                  When off, the /apply page shows a "closed" message instead of the form. The home
                  hero CTA button is controlled separately in the Upcoming Show tab.
                </span>
              </div>

              {/* Active form */}
              <div className="admin-section-title" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Active application form</h3>
              </div>
              <div className="apply-radio-group" role="radiogroup" style={{ marginBottom: 24 }}>
                {(
                  [
                    { value: 'default', label: 'Default Open Walls' },
                    { value: 'wandesford', label: 'Wandesford Quay' },
                  ] as { value: ApplicationFormType; label: string }[]
                ).map(({ value, label }) => (
                  <label key={value} className="apply-radio">
                    <input
                      type="radio"
                      name="active_form"
                      value={value}
                      checked={settings.activeForm === value}
                      onChange={() => patch({ activeForm: value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {/* Default form text */}
              <div className="admin-section-title" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Default Open Walls form text</h3>
              </div>
              <div className="admin-grid">
                <TextArea
                  label="Intro text"
                  value={settings.defaultIntro}
                  rows={5}
                  hint="Displayed at the top of the default application form. Use blank lines to separate paragraphs."
                  onChange={(v) => patch({ defaultIntro: v })}
                />
                <TextArea
                  label="Closed message"
                  value={settings.defaultClosedMessage}
                  rows={3}
                  hint="Shown on /apply when applications are closed and the default form is active."
                  onChange={(v) => patch({ defaultClosedMessage: v })}
                />
              </div>

              {/* Wandesford form text */}
              <div className="admin-section-title" style={{ marginBottom: 12, marginTop: 20 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Wandesford Quay form text</h3>
              </div>
              <div className="admin-grid">
                <TextArea
                  label="Intro / event description"
                  value={settings.wandesfordIntro}
                  rows={7}
                  hint="Main intro block at the top of the Wandesford form. Include event description, dates, and any key notes. Use blank lines for paragraphs."
                  onChange={(v) => patch({ wandesfordIntro: v })}
                />
                <TextArea
                  label="Application guidelines / rules"
                  value={settings.wandesfordGuidelines}
                  rows={5}
                  hint="Shown below the intro. Use for rules, eligibility, and process notes."
                  onChange={(v) => patch({ wandesfordGuidelines: v })}
                />
                <TextArea
                  label="Legal / consent text"
                  value={settings.wandesfordLegalText}
                  rows={5}
                  hint="Shown above the consent checkbox at the bottom of the Wandesford form."
                  onChange={(v) => patch({ wandesfordLegalText: v })}
                />
                <TextArea
                  label="Closed message"
                  value={settings.wandesfordClosedMessage}
                  rows={3}
                  hint="Shown on /apply when applications are closed and the Wandesford form is active."
                  onChange={(v) => patch({ wandesfordClosedMessage: v })}
                />
              </div>

              {saveState === 'error' && saveError && (
                <p className="admin-error" style={{ marginTop: 12 }}>{saveError}</p>
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
            </>
          )}
        </div>
      )}
    </section>
  );
}
