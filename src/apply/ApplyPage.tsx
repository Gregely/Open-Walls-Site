import { useEffect, useState } from 'react';
import { MotifStack } from '../components/MotifStack';
import { loadApplicationSettings } from '../lib/applicationSettingsApi';
import type { ApplicationSettings } from '../types/applicationSettings';
import { DefaultForm } from './DefaultForm';
import { WandesfordForm } from './WandesfordForm';

// ── Shared sub-components ─────────────────────────────────────────────────

function ApplyNav() {
  return (
    <header className="apply-nav">
      <a className="apply-nav__brand" href="/" aria-label="Open Walls home">
        <span className="apply-nav__mark">
          <MotifStack size={28} seed={88} layers={4} jitter={6} baseRot={-8} />
        </span>
        <span>Open Walls</span>
      </a>
      <a className="apply-nav__back" href="/">
        ← Back to site
      </a>
    </header>
  );
}

function SuccessState() {
  return (
    <div className="apply-success">
      <div aria-hidden="true">
        <MotifStack size={88} seed={42} layers={5} jitter={7} />
      </div>
      <h1 className="display apply-success__title">Thank you for applying!❤️</h1>
      <p className="apply-success__message">
        We'll get back to you in the next few days with the results of the applications :)
      </p>
      <a href="/" className="btn btn--ghost">
        ← Back to site
      </a>
    </div>
  );
}

function ClosedState({ message }: { message: string }) {
  return (
    <div className="apply-success">
      <div aria-hidden="true">
        <MotifStack size={88} seed={33} layers={4} jitter={8} />
      </div>
      <h1 className="display apply-success__title">Applications closed</h1>
      <p className="apply-success__message">{message}</p>
      <a href="/" className="btn btn--ghost">
        ← Back to site
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function ApplyPage() {
  const [settings, setSettings] = useState<ApplicationSettings | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Apply — Open Walls Cork';
    return () => {
      document.title = 'Open Walls Cork';
    };
  }, []);

  useEffect(() => {
    loadApplicationSettings().then(setSettings);
  }, []);

  return (
    <div className="apply-page">
      <ApplyNav />

      {submitted ? (
        <SuccessState />
      ) : !settings ? (
        <div className="site-loading">
          <MotifStack size={84} seed={88} layers={4} jitter={7} />
          <span>Loading</span>
        </div>
      ) : !settings.applicationsOpen ? (
        <ClosedState
          message={
            settings.activeForm === 'wandesford'
              ? settings.wandesfordClosedMessage
              : settings.defaultClosedMessage
          }
        />
      ) : settings.activeForm === 'wandesford' ? (
        <WandesfordForm settings={settings} onSuccess={() => setSubmitted(true)} />
      ) : (
        <DefaultForm settings={settings} onSuccess={() => setSubmitted(true)} />
      )}
    </div>
  );
}
