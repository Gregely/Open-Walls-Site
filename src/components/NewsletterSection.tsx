import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { MotifStack } from './MotifStack';
import { loadNewsletterSettings } from '../lib/newsletterSettingsApi';
import { DEFAULT_NEWSLETTER_SETTINGS } from '../types/newsletterSettings';
import type { NewsletterSettings } from '../types/newsletterSettings';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

type SubscribeStatus = 'idle' | 'loading' | 'success' | 'already' | 'error';

async function subscribeEmail(email: string): Promise<{ status: string; error?: string }> {
  if (!hasSupabaseConfig || !supabase) {
    return { status: 'error', error: 'Newsletter is not available.' };
  }
  const { data, error } = await supabase.functions.invoke('subscribe', {
    body: { email },
  });
  if (error) return { status: 'error', error: error.message || 'Something went wrong.' };
  return data as { status: string; error?: string };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Two small floating motifs matching the rest of the site.
function NlMotif({
  x,
  y,
  size,
  seed,
  jitter,
}: {
  x: number;
  y: number;
  size: number;
  seed: number;
  jitter: number;
}) {
  const dur = (7 + ((seed * 17) % 60) / 10).toFixed(1);
  const delay = (-((seed * 13) % 60) / 10).toFixed(1);
  return (
    <MotifStack
      size={size}
      seed={seed}
      jitter={jitter}
      layers={3}
      style={
        {
          left: `${x}%`,
          top: `${y}%`,
          '--dur': `${dur}s`,
          '--delay': `${delay}s`,
        } as CSSProperties
      }
    />
  );
}

export function NewsletterSection() {
  const [settings, setSettings] = useState<NewsletterSettings>(DEFAULT_NEWSLETTER_SETTINGS);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubscribeStatus>('idle');
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNewsletterSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setApiError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setValidationError('Please enter your email address.');
      inputRef.current?.focus();
      return;
    }
    if (!isValidEmail(trimmed)) {
      setValidationError('Please enter a valid email address.');
      inputRef.current?.focus();
      return;
    }

    setStatus('loading');
    const result = await subscribeEmail(trimmed);

    if (result.status === 'already_subscribed') {
      setStatus('already');
    } else if (result.status === 'subscribed') {
      setStatus('success');
    } else {
      setStatus('error');
      setApiError(result.error ?? settings.failureMessage);
    }
  };

  const isDone = status === 'success' || status === 'already';

  return (
    <section className="newsletter-section" id="newsletter" aria-labelledby="newsletter-title">
      <div className="newsletter-section__motifs" aria-hidden="true">
        <NlMotif x={-3} y={-20} size={160} seed={601} jitter={8} />
        <NlMotif x={86} y={30} size={120} seed={602} jitter={10} />
      </div>

      <div className="wrap newsletter-section__wrap">
        <div className="newsletter-section__inner">
          {/* Copy */}
          <div className="newsletter-section__copy">
            <h2 id="newsletter-title" className="newsletter-section__heading display">
              {settings.heading}
            </h2>
            <p className="newsletter-section__sub">{settings.subheading}</p>
          </div>

          {/* Form / done state */}
          <div className="newsletter-section__form-col">
            {isDone ? (
              <div className="newsletter-done" role="status">
                <span className="newsletter-done__icon" aria-hidden="true">✓</span>
                <p className="newsletter-done__msg">
                  {status === 'success'
                    ? settings.successMessage
                    : settings.alreadySubscribedMessage}
                </p>
              </div>
            ) : (
              <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
                <div className="newsletter-form__field">
                  <label htmlFor="newsletter-email" className="newsletter-form__label">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    ref={inputRef}
                    type="email"
                    className={`newsletter-form__input${
                      validationError ? ' newsletter-form__input--error' : ''
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationError('');
                      setApiError('');
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    aria-describedby={validationError || apiError ? 'newsletter-error' : undefined}
                    aria-invalid={!!(validationError || apiError)}
                    disabled={status === 'loading'}
                  />
                  {(validationError || apiError) && (
                    <p
                      id="newsletter-error"
                      className="newsletter-form__error"
                      role="alert"
                    >
                      {validationError || apiError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn--primary newsletter-form__btn"
                  disabled={status === 'loading'}
                  aria-busy={status === 'loading'}
                >
                  {status === 'loading' ? 'Subscribing…' : settings.buttonText}
                </button>

              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
