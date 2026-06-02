import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MotifStack } from '../components/MotifStack';
import { submitApplication } from '../lib/applicationApi';
import { hasSupabaseConfig } from '../lib/supabase';
import type { NewApplicationData } from '../types/application';

// ── Helpers ──────────────────────────────────────────────────────────────

type FormFields = NewApplicationData & {
  /** Honeypot field — must stay empty. Bots often fill fields labelled "website". */
  website: string;
};

const INITIAL_FIELDS: FormFields = {
  name: '',
  phone_number: '',
  email: '',
  art_type: '',
  work_size_or_count: '',
  display_method: '',
  wants_social_promotion: '',
  social_username: '',
  other_ideas_or_questions: '',
  website: '',
};

type FormErrors = Partial<Record<keyof FormFields, string>>;

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validate(fields: FormFields): FormErrors {
  const errors: FormErrors = {};
  if (!fields.name.trim()) errors.name = 'Please enter your name.';
  if (!fields.phone_number.trim()) errors.phone_number = 'Please enter your phone number.';
  if (!fields.email.trim()) errors.email = 'Please enter your email address.';
  else if (!isEmail(fields.email.trim())) errors.email = 'Please enter a valid email address.';
  return errors;
}

// ── Sub-components ────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────

export function ApplyPage() {
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    document.title = 'Apply — Open Walls Cork';
    return () => {
      document.title = 'Open Walls Cork';
    };
  }, []);

  const set = (key: keyof FormFields) => (value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    // Clear field error as the user starts correcting it
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Honeypot: if a bot filled the "website" field, pretend success without writing to DB.
    if (fields.website) {
      setSubmitted(true);
      return;
    }

    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      // Move focus to the first field with an error
      const firstKey = Object.keys(validationErrors)[0] as keyof FormFields;
      document.getElementById(`apply-${firstKey}`)?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      // Destructure out the honeypot before sending
      const { website: _honeypot, ...applicationData } = fields;
      await submitApplication(applicationData);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again or email us directly.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="apply-page">
      <ApplyNav />

      {submitted ? (
        <SuccessState />
      ) : (
        <main className="apply-main">
          {/* Page header */}
          <div className="apply-header">
            <div className="apply-header__motif" aria-hidden="true">
              <MotifStack size={108} seed={77} layers={5} jitter={8} />
            </div>
            <span className="tag apply-header__tag">Open Walls Cork</span>
            <h1 className="display apply-title">Artist Application</h1>
            <div className="apply-intro">
              <p>Huzzah, fellow artist! Welcome :)</p>
              <p>
                Open walls is a monthly art show in Cork which provides a regular space for artists to share their work.
                All creative forms are welcome! Fill out the form and we'll get in touch to confirm your spot at the
                next show :) Applications are accepted first-come-first-served (there's no selection process based on
                taste).
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="apply-form" onSubmit={handleSubmit} noValidate>
            {/* Honeypot — visually hidden; should remain empty for real users */}
            <div className="apply-honeypot" aria-hidden="true">
              <label htmlFor="apply-website">Website</label>
              <input
                id="apply-website"
                type="text"
                value={fields.website}
                onChange={(e) => set('website')(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Q1: Name */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-name">
                Name <span className="apply-required" aria-label="required">*</span>
              </label>
              <input
                id="apply-name"
                type="text"
                className={`apply-input${errors.name ? ' apply-input--error' : ''}`}
                value={fields.name}
                onChange={(e) => set('name')(e.target.value)}
                autoComplete="name"
                aria-describedby={errors.name ? 'apply-name-error' : undefined}
              />
              {errors.name && (
                <span id="apply-name-error" className="apply-error-msg" role="alert">
                  {errors.name}
                </span>
              )}
            </div>

            {/* Q2: Phone number */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-phone_number">
                Phone number <span className="apply-required" aria-label="required">*</span>
              </label>
              <span className="apply-field__hint">
                We'll make a group chat with all the artists for this show to make it easier to share info.
              </span>
              <input
                id="apply-phone_number"
                type="tel"
                className={`apply-input${errors.phone_number ? ' apply-input--error' : ''}`}
                value={fields.phone_number}
                onChange={(e) => set('phone_number')(e.target.value)}
                autoComplete="tel"
                aria-describedby={errors.phone_number ? 'apply-phone_number-error' : undefined}
              />
              {errors.phone_number && (
                <span id="apply-phone_number-error" className="apply-error-msg" role="alert">
                  {errors.phone_number}
                </span>
              )}
            </div>

            {/* Q3: Email */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-email">
                Email <span className="apply-required" aria-label="required">*</span>
              </label>
              <input
                id="apply-email"
                type="email"
                className={`apply-input${errors.email ? ' apply-input--error' : ''}`}
                value={fields.email}
                onChange={(e) => set('email')(e.target.value)}
                autoComplete="email"
                aria-describedby={errors.email ? 'apply-email-error' : undefined}
              />
              {errors.email && (
                <span id="apply-email-error" className="apply-error-msg" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Q4: Art type */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-art_type">
                What type of art is your art?
              </label>
              <input
                id="apply-art_type"
                type="text"
                className="apply-input"
                value={fields.art_type}
                onChange={(e) => set('art_type')(e.target.value)}
              />
            </div>

            {/* Q5: Work size / count */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-work_size_or_count">
                What size is your work, or how many of them do you have?
              </label>
              <textarea
                id="apply-work_size_or_count"
                className="apply-textarea"
                rows={4}
                value={fields.work_size_or_count}
                onChange={(e) => set('work_size_or_count')(e.target.value)}
              />
            </div>

            {/* Q6: Display method */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-display_method">
                How will you display your work?
              </label>
              <span className="apply-field__hint">You'll need to bring your own supplies.</span>
              <textarea
                id="apply-display_method"
                className="apply-textarea"
                rows={4}
                value={fields.display_method}
                onChange={(e) => set('display_method')(e.target.value)}
              />
            </div>

            {/* Q7: Social promotion — radio */}
            <div className="apply-field">
              <fieldset className="apply-fieldset">
                <legend className="apply-field__label">
                  Would you like us to help promote your work through our social media before or after the event?
                </legend>
                <span className="apply-field__hint">
                  If yes, when we confirm your spot on the show we'll email you with the details on how to do it.
                </span>
                <div className="apply-radio-group" role="radiogroup">
                  {(['Yes pleases', 'No thanku'] as const).map((option) => (
                    <label key={option} className="apply-radio">
                      <input
                        type="radio"
                        name="wants_social_promotion"
                        value={option}
                        checked={fields.wants_social_promotion === option}
                        onChange={() => set('wants_social_promotion')(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Q8: Social username */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-social_username">
                If yes, you can include your username here :)
              </label>
              {fields.wants_social_promotion === 'Yes pleases' && (
                <span className="apply-field__hint apply-field__hint--nudge">
                  Since you'd like promotion, feel free to include your handle below!
                </span>
              )}
              <input
                id="apply-social_username"
                type="text"
                className="apply-input"
                value={fields.social_username}
                onChange={(e) => set('social_username')(e.target.value)}
                placeholder="@yourhandle"
              />
            </div>

            {/* Q9: Other ideas */}
            <div className="apply-field">
              <label className="apply-field__label" htmlFor="apply-other_ideas_or_questions">
                Do you have any other ideas or questions for open walls?
              </label>
              <textarea
                id="apply-other_ideas_or_questions"
                className="apply-textarea"
                rows={4}
                value={fields.other_ideas_or_questions}
                onChange={(e) => set('other_ideas_or_questions')(e.target.value)}
              />
            </div>

            {/* Submission errors */}
            {submitError && (
              <div className="apply-error-bar" role="alert">
                {submitError}
              </div>
            )}

            {!hasSupabaseConfig && (
              <div className="apply-error-bar" role="alert">
                The application form is not yet configured. Please email us directly for now.
              </div>
            )}

            <div className="apply-submit-row">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting || !hasSupabaseConfig}
              >
                {submitting ? 'Sending...' : 'Submit application →'}
              </button>
            </div>
          </form>
        </main>
      )}
    </div>
  );
}
