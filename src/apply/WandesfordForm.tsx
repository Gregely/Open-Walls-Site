import { useState } from 'react';
import type { FormEvent } from 'react';
import { submitApplication } from '../lib/applicationApi';
import { hasSupabaseConfig } from '../lib/supabase';
import type { ApplicationSettings } from '../types/applicationSettings';
import { WANDESFORD_ATTENDEE_TYPES } from '../types/applicationSettings';
import type { WandesfordAttendeeType } from '../types/applicationSettings';

// ── Word count helpers ────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function WordCount({ text, max }: { text: string; max: number }) {
  const count = countWords(text);
  const over = count > max;
  return (
    <span className={`apply-word-count${over ? ' apply-word-count--over' : ''}`} aria-live="polite">
      {count} / {max} words{over ? ' — too long' : ''}
    </span>
  );
}

// ── Paragraphs helper ─────────────────────────────────────────────────────

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function CategoryInfoBlock({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="apply-intro apply-intro--category">
      {paragraphs(text).map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ── Form state ────────────────────────────────────────────────────────────

type WandesfordFields = {
  // Honeypot
  website: string;
  // Shared required
  name: string;
  email: string;
  contact_number: string;
  // Shared
  socials: string;
  // Most types: description + bio + primary reference
  description: string;
  bio: string;
  reference_link: string;
  // Installation only
  setup_requirements: string;
  // Video only
  video_link: string;
  // Performance only
  duration_perf: string;
  technical_needs_perf: string;
  reference_link_optional: string;
  // Workshop only
  description_workshop: string;
  attendee_count: string;
  materials: string;
  charge: string;          // 'yes' | 'no' | ''
  charge_amount: string;
  technical_needs_ws: string;
  duration_ws: string;
  // Consent
  consent: boolean;
};

const INITIAL: WandesfordFields = {
  website: '',
  name: '',
  email: '',
  contact_number: '',
  socials: '',
  description: '',
  bio: '',
  reference_link: '',
  setup_requirements: '',
  video_link: '',
  duration_perf: '',
  technical_needs_perf: '',
  reference_link_optional: '',
  description_workshop: '',
  attendee_count: '',
  materials: '',
  charge: '',
  charge_amount: '',
  technical_needs_ws: '',
  duration_ws: '',
  consent: false,
};

type FormErrors = Partial<Record<keyof WandesfordFields | 'attendeeType', string>>;

function validate(
  fields: WandesfordFields,
  attendeeType: WandesfordAttendeeType | '',
): FormErrors {
  const errors: FormErrors = {};

  if (!fields.name.trim()) errors.name = 'Please enter your full name.';
  if (!fields.email.trim()) errors.email = 'Please enter your email address.';
  else if (!isEmail(fields.email.trim())) errors.email = 'Please enter a valid email address.';
  if (!fields.contact_number.trim()) errors.contact_number = 'Please enter your contact number.';
  if (!attendeeType) errors.attendeeType = 'Please select an attendee type.';
  if (!fields.consent) errors.consent = 'You must agree to the terms before submitting.';

  if (!attendeeType) return errors;

  if (!fields.socials.trim()) errors.socials = 'Please enter your socials or a link to your work.';

  if (attendeeType === 'Workshop') {
    if (!fields.description_workshop.trim())
      errors.description_workshop = 'Please describe your workshop.';
    else if (countWords(fields.description_workshop) > 50)
      errors.description_workshop = 'Please shorten your description to 50 words.';
    if (!fields.bio.trim())
      errors.bio = 'Please enter a bio.';
    if (!fields.attendee_count.trim())
      errors.attendee_count = 'Please enter the approximate number of attendees.';
    if (!fields.materials.trim())
      errors.materials = "Please describe the materials you'll bring or use.";
    if (!fields.charge)
      errors.charge = 'Please indicate whether you will charge attendees.';
    if (fields.charge === 'yes' && !fields.charge_amount.trim())
      errors.charge_amount = 'Please enter the charge amount.';
    if (!fields.technical_needs_ws.trim())
      errors.technical_needs_ws = 'Please describe any extra technical needs, or enter "none".';
    if (!fields.duration_ws.trim())
      errors.duration_ws = 'Please enter the workshop duration.';
  } else {
    if (!fields.description.trim())
      errors.description = 'Please enter a description of your work.';
    else if (countWords(fields.description) > 100)
      errors.description = 'Please shorten your description to 100 words.';
    if (!fields.bio.trim())
      errors.bio = 'Please enter a bio.';
    if (attendeeType === 'Art Market') {
      if (!fields.reference_link.trim())
        errors.reference_link = 'Please add a reference image link.';
    }
    if (attendeeType === 'Installation') {
      if (!fields.reference_link.trim())
        errors.reference_link = 'Please add a reference image link.';
      if (!fields.setup_requirements.trim())
        errors.setup_requirements = 'Please describe your setup or space requirements.';
    }
    if (attendeeType === 'Video') {
      if (!fields.video_link.trim())
        errors.video_link = 'Please add your video segment link.';
    }
    if (attendeeType === 'Performance') {
      if (!fields.duration_perf.trim())
        errors.duration_perf = 'Please enter the duration of your performance.';
      if (!fields.technical_needs_perf.trim())
        errors.technical_needs_perf = 'Please describe any extra technical needs, or enter "none".';
      // reference_link_optional is intentionally not required
    }
  }

  if (countWords(fields.bio) > 50)
    errors.bio = 'Please shorten your bio to 50 words.';

  return errors;
}

// Collects only the answers relevant to the chosen attendee type.
function buildAnswers(
  fields: WandesfordFields,
  attendeeType: WandesfordAttendeeType,
): Record<string, string> {
  const base: Record<string, string> = {};
  if (fields.socials.trim()) base.socials = fields.socials.trim();

  if (attendeeType === 'Art Market') {
    if (fields.description.trim()) base.description = fields.description.trim();
    if (fields.bio.trim()) base.bio = fields.bio.trim();
    if (fields.reference_link.trim()) base.reference_link = fields.reference_link.trim();
  }

  if (attendeeType === 'Installation') {
    if (fields.description.trim()) base.description = fields.description.trim();
    if (fields.bio.trim()) base.bio = fields.bio.trim();
    if (fields.reference_link.trim()) base.reference_link = fields.reference_link.trim();
    if (fields.setup_requirements.trim()) base.setup_requirements = fields.setup_requirements.trim();
  }

  if (attendeeType === 'Video') {
    if (fields.description.trim()) base.description = fields.description.trim();
    if (fields.bio.trim()) base.bio = fields.bio.trim();
    if (fields.video_link.trim()) base.video_link = fields.video_link.trim();
  }

  if (attendeeType === 'Performance') {
    if (fields.description.trim()) base.description = fields.description.trim();
    if (fields.bio.trim()) base.bio = fields.bio.trim();
    if (fields.duration_perf.trim()) base.duration = fields.duration_perf.trim();
    if (fields.technical_needs_perf.trim()) base.technical_needs = fields.technical_needs_perf.trim();
    if (fields.reference_link_optional.trim()) base.reference_link_optional = fields.reference_link_optional.trim();
  }

  if (attendeeType === 'Workshop') {
    if (fields.description_workshop.trim()) base.description = fields.description_workshop.trim();
    if (fields.bio.trim()) base.bio = fields.bio.trim();
    if (fields.attendee_count.trim()) base.attendee_count = fields.attendee_count.trim();
    if (fields.materials.trim()) base.materials = fields.materials.trim();
    if (fields.charge) base.charge = fields.charge;
    if (fields.charge === 'yes' && fields.charge_amount.trim())
      base.charge_amount = fields.charge_amount.trim();
    if (fields.technical_needs_ws.trim()) base.technical_needs = fields.technical_needs_ws.trim();
    if (fields.duration_ws.trim()) base.duration = fields.duration_ws.trim();
  }

  return base;
}

// ── Sub-field components ──────────────────────────────────────────────────

function ApplyField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="apply-field">
      <label className="apply-field__label" htmlFor={id}>
        {label}
      </label>
      {hint && <span className="apply-field__hint">{hint}</span>}
      {children}
      {error && (
        <span className="apply-error-msg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  hasError,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  hasError?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      className={`apply-input${hasError ? ' apply-input--error' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
  );
}

function TextArea({
  id,
  value,
  onChange,
  rows = 4,
  hasError,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hasError?: boolean;
}) {
  return (
    <textarea
      id={id}
      className={`apply-textarea${hasError ? ' apply-input--error' : ''}`}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ── Attendee-type-specific field blocks ────────────────────────────────────

function SharedFields({
  fields,
  errors,
  set,
}: {
  fields: WandesfordFields;
  errors: FormErrors;
  set: (key: keyof WandesfordFields) => (v: string) => void;
}) {
  return (
    <>
      <ApplyField id="w-socials" label="Socials" hint="Instagram, website, or any relevant link" error={errors.socials}>
        <TextInput id="w-socials" value={fields.socials} onChange={set('socials')} placeholder="@yourhandle or https://..." hasError={!!errors.socials} />
      </ApplyField>
    </>
  );
}

function DescriptionAndBio({
  fields,
  errors,
  set,
  descriptionLabel,
  descriptionMax,
  descriptionId,
  descriptionKey,
}: {
  fields: WandesfordFields;
  errors: FormErrors;
  set: (key: keyof WandesfordFields) => (v: string) => void;
  descriptionLabel: string;
  descriptionMax: number;
  descriptionId: string;
  descriptionKey: keyof WandesfordFields;
}) {
  const descText = fields[descriptionKey] as string;
  const bioText = fields.bio;
  return (
    <>
      <ApplyField
        id={descriptionId}
        label={descriptionLabel}
        error={errors[descriptionKey] as string | undefined}
      >
        <TextArea
          id={descriptionId}
          value={descText}
          onChange={set(descriptionKey)}
          rows={5}
          hasError={!!(errors[descriptionKey])}
        />
        <WordCount text={descText} max={descriptionMax} />
      </ApplyField>

      <ApplyField id="w-bio" label="Bio" hint="50 words max" error={errors.bio}>
        <TextArea
          id="w-bio"
          value={bioText}
          onChange={set('bio')}
          rows={3}
          hasError={!!errors.bio}
        />
        <WordCount text={bioText} max={50} />
      </ApplyField>
    </>
  );
}

function ArtMarketFields({
  fields,
  errors,
  set,
}: {
  fields: WandesfordFields;
  errors: FormErrors;
  set: (key: keyof WandesfordFields) => (v: string) => void;
}) {
  return (
    <>
      <DescriptionAndBio
        fields={fields}
        errors={errors}
        set={set}
        descriptionLabel="Description of work"
        descriptionMax={100}
        descriptionId="w-description"
        descriptionKey="description"
      />
      <ApplyField
        id="w-reference_link"
        label="Reference image / documentation link"
        hint="Paste a permanent link to up to 3 images, or a folder containing them — Google Drive, Dropbox, or similar. Make sure it's set to 'Anyone with the link can view'."
        error={errors.reference_link}
      >
        <TextInput id="w-reference_link" value={fields.reference_link} onChange={set('reference_link')} placeholder="https://..." hasError={!!errors.reference_link} />
      </ApplyField>
    </>
  );
}

function InstallationFields({
  fields,
  errors,
  set,
}: {
  fields: WandesfordFields;
  errors: FormErrors;
  set: (key: keyof WandesfordFields) => (v: string) => void;
}) {
  return (
    <>
      <DescriptionAndBio
        fields={fields}
        errors={errors}
        set={set}
        descriptionLabel="Description of work"
        descriptionMax={100}
        descriptionId="w-description"
        descriptionKey="description"
      />
      <ApplyField
        id="w-reference_link"
        label="Reference image / documentation link"
        hint="Paste a permanent link to up to 3 images, or a folder containing them — Google Drive, Dropbox, or similar. Make sure it's set to 'Anyone with the link can view'."
        error={errors.reference_link}
      >
        <TextInput id="w-reference_link" value={fields.reference_link} onChange={set('reference_link')} placeholder="https://..." hasError={!!errors.reference_link} />
      </ApplyField>
      <ApplyField
        id="w-setup_requirements"
        label="Setup / space requirements"
        hint="Briefly describe your space requirements."
        error={errors.setup_requirements}
      >
        <TextArea id="w-setup_requirements" value={fields.setup_requirements} onChange={set('setup_requirements')} rows={3} hasError={!!errors.setup_requirements} />
      </ApplyField>
    </>
  );
}

function VideoFields({
  fields,
  errors,
  set,
}: {
  fields: WandesfordFields;
  errors: FormErrors;
  set: (key: keyof WandesfordFields) => (v: string) => void;
}) {
  return (
    <>
      <DescriptionAndBio
        fields={fields}
        errors={errors}
        set={set}
        descriptionLabel="Description of work"
        descriptionMax={100}
        descriptionId="w-description"
        descriptionKey="description"
      />
      <ApplyField
        id="w-video_link"
        label="Video segment link"
        hint="Paste a permanent link to your video segment — Vimeo, YouTube, Google Drive, Dropbox, or similar. If linking a downloadable file, please keep it under 50 MB. Make sure it's publicly accessible."
        error={errors.video_link}
      >
        <TextInput id="w-video_link" value={fields.video_link} onChange={set('video_link')} placeholder="https://..." hasError={!!errors.video_link} />
      </ApplyField>
    </>
  );
}

function PerformanceFields({
  fields,
  errors,
  set,
}: {
  fields: WandesfordFields;
  errors: FormErrors;
  set: (key: keyof WandesfordFields) => (v: string) => void;
}) {
  return (
    <>
      <DescriptionAndBio
        fields={fields}
        errors={errors}
        set={set}
        descriptionLabel="Description of work"
        descriptionMax={100}
        descriptionId="w-description"
        descriptionKey="description"
      />
      <ApplyField id="w-duration_perf" label="Duration" hint="e.g. 15 minutes, 30 minutes" error={errors.duration_perf}>
        <TextInput id="w-duration_perf" value={fields.duration_perf} onChange={set('duration_perf')} placeholder="e.g. 20 minutes" hasError={!!errors.duration_perf} />
      </ApplyField>
      <ApplyField
        id="w-technical_needs_perf"
        label="Extra technical needs"
        hint="e.g. PA system, projector, microphone. This means technical needs, not materials you'll bring."
        error={errors.technical_needs_perf}
      >
        <TextArea id="w-technical_needs_perf" value={fields.technical_needs_perf} onChange={set('technical_needs_perf')} rows={3} hasError={!!errors.technical_needs_perf} />
      </ApplyField>
      <ApplyField
        id="w-reference_link_optional"
        label="Reference video / audio / documentation link"
        hint="Paste a permanent link to any supporting material — Vimeo, YouTube, SoundCloud, Google Drive, or similar. (optional)"
      >
        <TextInput id="w-reference_link_optional" value={fields.reference_link_optional} onChange={set('reference_link_optional')} placeholder="https://..." />
      </ApplyField>
    </>
  );
}

function WorkshopFields({
  fields,
  errors,
  set,
}: {
  fields: WandesfordFields;
  errors: FormErrors;
  set: (key: keyof WandesfordFields) => (v: string) => void;
}) {
  return (
    <>
      <DescriptionAndBio
        fields={fields}
        errors={errors}
        set={set}
        descriptionLabel="Description of workshop"
        descriptionMax={50}
        descriptionId="w-description_workshop"
        descriptionKey="description_workshop"
      />
      <ApplyField
        id="w-attendee_count"
        label="Number of attendees"
        hint="Approximate number of people the workshop is for"
        error={errors.attendee_count}
      >
        <TextInput
          id="w-attendee_count"
          value={fields.attendee_count}
          onChange={set('attendee_count')}
          placeholder="e.g. 10–15"
          hasError={!!errors.attendee_count}
        />
      </ApplyField>
      <ApplyField
        id="w-materials"
        label="Materials brought / used"
        hint="List materials you'll bring or that attendees will need."
        error={errors.materials}
      >
        <TextArea id="w-materials" value={fields.materials} onChange={set('materials')} rows={3} hasError={!!errors.materials} />
      </ApplyField>
      <div className="apply-field">
        <fieldset className="apply-fieldset">
          <legend className="apply-field__label">Will you charge attendees?</legend>
          <div className="apply-radio-group" role="radiogroup">
            {(['yes', 'no'] as const).map((option) => (
              <label key={option} className="apply-radio">
                <input
                  type="radio"
                  name="w-charge"
                  value={option}
                  checked={fields.charge === option}
                  onChange={() => set('charge')(option)}
                />
                <span>{option === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
          {errors.charge && (
            <span className="apply-error-msg" role="alert">
              {errors.charge}
            </span>
          )}
        </fieldset>
      </div>
      {fields.charge === 'yes' && (
        <ApplyField id="w-charge_amount" label="If yes, how much?" error={errors.charge_amount}>
          <TextInput
            id="w-charge_amount"
            value={fields.charge_amount}
            onChange={set('charge_amount')}
            placeholder="e.g. €5 per person"
            hasError={!!errors.charge_amount}
          />
        </ApplyField>
      )}
      <ApplyField
        id="w-technical_needs_ws"
        label="Extra technical needs"
        hint="e.g. projector, screen, whiteboard. This means technical needs, not materials you'll bring."
        error={errors.technical_needs_ws}
      >
        <TextArea id="w-technical_needs_ws" value={fields.technical_needs_ws} onChange={set('technical_needs_ws')} rows={3} hasError={!!errors.technical_needs_ws} />
      </ApplyField>
      <ApplyField id="w-duration_ws" label="Duration" hint="e.g. 1 hour, 90 minutes" error={errors.duration_ws}>
        <TextInput
          id="w-duration_ws"
          value={fields.duration_ws}
          onChange={set('duration_ws')}
          placeholder="e.g. 1 hour"
          hasError={!!errors.duration_ws}
        />
      </ApplyField>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function WandesfordForm({
  settings,
  onSuccess,
}: {
  settings: ApplicationSettings;
  onSuccess: () => void;
}) {
  const [attendeeType, setAttendeeType] = useState<WandesfordAttendeeType | ''>('');
  const [fields, setFields] = useState<WandesfordFields>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (key: keyof WandesfordFields) => (value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleAttendeeType = (type: WandesfordAttendeeType) => {
    setAttendeeType(type);
    if (errors.attendeeType) setErrors((prev) => ({ ...prev, attendeeType: undefined }));
    // Reset all type-specific fields when type changes
    setFields((prev) => ({
      ...prev,
      description: '',
      bio: '',
      reference_link: '',
      setup_requirements: '',
      video_link: '',
      duration_perf: '',
      technical_needs_perf: '',
      reference_link_optional: '',
      description_workshop: '',
      attendee_count: '',
      materials: '',
      charge: '',
      charge_amount: '',
      technical_needs_ws: '',
      duration_ws: '',
    }));
    setErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (fields.website) {
      onSuccess();
      return;
    }

    const validationErrors = validate(fields, attendeeType);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      const el =
        document.getElementById(`w-${firstKey}`) ||
        document.getElementById(`w-attendeeType`) ||
        document.querySelector<HTMLElement>(`[name="w-charge"]`);
      el?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await submitApplication({
        name: fields.name.trim(),
        phone_number: fields.contact_number.trim(),
        email: fields.email.trim(),
        form_type: 'wandesford',
        attendee_type: attendeeType as string,
        answers: buildAnswers(fields, attendeeType as WandesfordAttendeeType),
      });
      onSuccess();
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
    <main className="apply-main">
      <div className="apply-header">
        <span className="tag apply-header__tag">Wandesford Quay</span>
        <h1 className="display apply-title">Artist Application</h1>
        <div className="apply-intro">
          {paragraphs(settings.wandesfordIntro).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {settings.wandesfordGuidelines && (
          <div className="apply-intro apply-intro--guidelines">
            {paragraphs(settings.wandesfordGuidelines).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        )}
      </div>

      <form className="apply-form" onSubmit={handleSubmit} noValidate>
        {/* Honeypot */}
        <div className="apply-honeypot" aria-hidden="true">
          <label htmlFor="w-website">Website</label>
          <input
            id="w-website"
            type="text"
            value={fields.website}
            onChange={(e) => set('website')(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Attendee type */}
        <div className="apply-field">
          <fieldset className="apply-fieldset">
            <legend className="apply-field__label">Attendee type</legend>
            <span className="apply-field__hint">Select the section you are applying for.</span>
            <div className="apply-radio-group apply-radio-group--wrap" role="radiogroup" id="w-attendeeType">
              {WANDESFORD_ATTENDEE_TYPES.map((type) => (
                <label key={type} className="apply-radio">
                  <input
                    type="radio"
                    name="attendeeType"
                    value={type}
                    checked={attendeeType === type}
                    onChange={() => handleAttendeeType(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
            {errors.attendeeType && (
              <span className="apply-error-msg" role="alert">
                {errors.attendeeType}
              </span>
            )}
          </fieldset>
        </div>

        {/* Selected category info text — shown directly below the type selector */}
        {attendeeType === 'Art Market' && <CategoryInfoBlock text={settings.wandesfordArtMarketText} />}
        {attendeeType === 'Installation' && <CategoryInfoBlock text={settings.wandesfordInstallationText} />}
        {attendeeType === 'Video' && <CategoryInfoBlock text={settings.wandesfordVideoText} />}
        {attendeeType === 'Performance' && <CategoryInfoBlock text={settings.wandesfordPerformanceText} />}
        {attendeeType === 'Workshop' && <CategoryInfoBlock text={settings.wandesfordWorkshopText} />}

        {/* Shared required fields — always shown */}
        <ApplyField id="w-name" label="Full name" error={errors.name}>
          <TextInput
            id="w-name"
            value={fields.name}
            onChange={set('name')}
            autoComplete="name"
            hasError={!!errors.name}
          />
        </ApplyField>

        <ApplyField id="w-email" label="Email" error={errors.email}>
          <TextInput
            id="w-email"
            type="email"
            value={fields.email}
            onChange={set('email')}
            autoComplete="email"
            hasError={!!errors.email}
          />
        </ApplyField>

        <ApplyField id="w-contact_number" label="Contact number" error={errors.contact_number}>
          <TextInput
            id="w-contact_number"
            type="tel"
            value={fields.contact_number}
            onChange={set('contact_number')}
            autoComplete="tel"
            hasError={!!errors.contact_number}
          />
        </ApplyField>

        {/* Socials — shared */}
        <SharedFields fields={fields} errors={errors} set={set} />

        {/* Conditional fields by attendee type */}
        {attendeeType === 'Art Market' && (
          <ArtMarketFields fields={fields} errors={errors} set={set} />
        )}
        {attendeeType === 'Installation' && (
          <InstallationFields fields={fields} errors={errors} set={set} />
        )}
        {attendeeType === 'Video' && (
          <VideoFields fields={fields} errors={errors} set={set} />
        )}
        {attendeeType === 'Performance' && (
          <PerformanceFields fields={fields} errors={errors} set={set} />
        )}
        {attendeeType === 'Workshop' && (
          <WorkshopFields fields={fields} errors={errors} set={set} />
        )}

        {/* Legal / consent — shown once attendee type is selected */}
        {attendeeType && (
          <div className="apply-field apply-field--consent">
            {settings.wandesfordLegalText && (
              <div className="apply-legal-text">
                {paragraphs(settings.wandesfordLegalText).map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            )}
            <label className={`apply-consent-check${errors.consent ? ' apply-consent-check--error' : ''}`}>
              <input
                type="checkbox"
                checked={fields.consent}
                onChange={(e) => {
                  setFields((prev) => ({ ...prev, consent: e.target.checked }));
                  if (errors.consent) setErrors((prev) => ({ ...prev, consent: undefined }));
                }}
              />
              <span>I have read and agree to the above.</span>
            </label>
            {errors.consent && (
              <span className="apply-error-msg" role="alert">
                {errors.consent}
              </span>
            )}
          </div>
        )}

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
  );
}
