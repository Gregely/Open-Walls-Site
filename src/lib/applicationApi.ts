import { supabase } from './supabase';
import type { Application, ApplicationStatus, NewApplicationData } from '../types/application';

/**
 * Submit a new artist application from the public /apply form.
 * Anonymous users are allowed to INSERT via RLS policy.
 * Empty optional strings are stored as NULL.
 */
export async function submitApplication(data: NewApplicationData): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
  }
  const payload = {
    name: data.name.trim(),
    phone_number: data.phone_number.trim(),
    email: data.email.trim().toLowerCase(),
    art_type: data.art_type.trim() || null,
    work_size_or_count: data.work_size_or_count.trim() || null,
    display_method: data.display_method.trim() || null,
    wants_social_promotion: data.wants_social_promotion || null,
    social_username: data.social_username.trim() || null,
    other_ideas_or_questions: data.other_ideas_or_questions.trim() || null,
  };
  const { error } = await supabase.from('applications').insert(payload);
  if (error) throw error;
}

/**
 * List all applications, newest first.
 * Requires an authenticated admin session (RLS blocks anonymous reads).
 */
export async function listApplications(): Promise<Application[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Application[];
}

/** Update the status of an application. Requires authenticated session. */
export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('applications').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Save organiser notes for an application. Empty string stores as NULL. */
export async function updateApplicationNotes(id: string, notes: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase
    .from('applications')
    .update({ organiser_notes: notes.trim() || null })
    .eq('id', id);
  if (error) throw error;
}

/** Permanently delete an application. Requires authenticated session. */
export async function deleteApplication(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) throw error;
}
