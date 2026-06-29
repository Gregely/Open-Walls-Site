export type ApplicationStatus = 'new' | 'reviewed' | 'accepted' | 'rejected' | 'waitlist';

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'waitlist', label: 'Waitlist' },
];

/** A full application row as returned from Supabase. */
export type Application = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone_number: string;
  email: string;
  art_type: string | null;
  work_size_or_count: string | null;
  display_method: string | null;
  wants_social_promotion: string | null;
  social_username: string | null;
  other_ideas_or_questions: string | null;
  status: ApplicationStatus;
  organiser_notes: string | null;
  // Added in migration — optional here so old rows (before migration) don't crash.
  // Treat missing values as the defaults below.
  form_type?: string;                    // 'default' | 'wandesford'; missing = 'default'
  attendee_type?: string;                // WandesfordAttendeeType or ''; missing = ''
  answers?: Record<string, unknown>;     // wandesford extra answers; missing = {}
};

/**
 * Fields submitted from the public /apply (default Open Walls) form.
 * All optional fields are strings (empty string = not answered).
 * The API layer converts empty strings to null before inserting.
 */
export type NewApplicationData = {
  name: string;
  phone_number: string;
  email: string;
  art_type: string;
  work_size_or_count: string;
  display_method: string;
  wants_social_promotion: string;
  social_username: string;
  other_ideas_or_questions: string;
};

/**
 * Unified submit payload accepted by submitApplication().
 * Covers both the default form and the Wandesford form.
 */
export type SubmitApplicationPayload = {
  name: string;
  phone_number: string;
  email: string;
  // Default form optional fields
  art_type?: string;
  work_size_or_count?: string;
  display_method?: string;
  wants_social_promotion?: string;
  social_username?: string;
  other_ideas_or_questions?: string;
  // Template metadata
  form_type: 'default' | 'wandesford';
  attendee_type: string;
  answers: Record<string, string>;
};
