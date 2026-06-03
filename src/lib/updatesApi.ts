import type { Update } from '../types/update';
import { hasSupabaseConfig, supabase } from './supabase';

type UpdateRow = {
  id: string;
  title: string | null;
  slug: string | null;
  subtitle: string | null;
  label: string | null;
  update_date: string | null;
  image_url: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  published: boolean | null;
  pinned: boolean | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapUpdate(row: UpdateRow): Update {
  return {
    id: row.id,
    title: row.title || '',
    slug: row.slug || '',
    subtitle: row.subtitle || '',
    label: row.label || '',
    date: row.update_date || '',
    imageUrl: row.image_url || '',
    body: row.body || '',
    ctaLabel: row.cta_label || '',
    ctaUrl: row.cta_url || '',
    published: row.published ?? false,
    pinned: row.pinned ?? false,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function updatePayload(update: Update) {
  return {
    id: update.id,
    title: update.title,
    slug: update.slug,
    subtitle: update.subtitle,
    label: update.label,
    update_date: update.date,
    image_url: update.imageUrl,
    body: update.body,
    cta_label: update.ctaLabel,
    cta_url: update.ctaUrl,
    published: update.published,
    pinned: update.pinned,
    display_order: update.displayOrder,
  };
}

// Load updates for the public site (published only).
export async function loadPublishedUpdates(): Promise<Update[]> {
  if (!hasSupabaseConfig || !supabase) return [];
  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .eq('published', true)
    .order('pinned', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load updates:', error.message);
    return [];
  }
  return (data as UpdateRow[]).map(mapUpdate);
}

// Load a single published update by slug (public).
export async function loadUpdateBySlug(slug: string): Promise<Update | null> {
  if (!hasSupabaseConfig || !supabase) return null;
  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error || !data) return null;
  return mapUpdate(data as UpdateRow);
}

// Load all updates for the admin (including unpublished).
export async function loadAllUpdates(): Promise<Update[]> {
  if (!hasSupabaseConfig || !supabase) return [];
  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .order('pinned', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as UpdateRow[]).map(mapUpdate);
}

// Upsert a single update.
export async function saveUpdate(update: Update): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase
    .from('updates')
    .upsert(updatePayload(update), { onConflict: 'id' });
  if (error) throw error;
}

// Delete a single update by id.
export async function deleteUpdate(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('updates').delete().eq('id', id);
  if (error) throw error;
}

// Slugify a string for use as a URL slug.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
