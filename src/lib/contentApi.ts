import { fallbackContent } from '../data/content';
import type { ContentLoadResult, PastShow, SiteContent, SiteSettings, UpcomingShow } from '../types/content';
import { hasSupabaseConfig, supabase } from './supabase';

const SITE_ID = 'default';
const UPCOMING_ID = 'current';

type SiteSettingsRow = {
  site_name: string | null;
  tagline: string | null;
  hero_title: string | null;
  hero_body: string | null;
  about_title: string | null;
  about_body: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  footer_text: string | null;
};

type UpcomingShowRow = {
  volume: string | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  location: string | null;
  description: string | null;
  free_entry: boolean | null;
  artists: unknown;
  cta_label: string | null;
  cta_email_subject: string | null;
  cta_email_body: string | null;
};

type PastShowRow = {
  id: string;
  volume: string | null;
  date: string | null;
  venue: string | null;
  location: string | null;
  artists: unknown;
  notes: string | null;
  display_order: number | null;
  visible: boolean | null;
  accent: string | null;
  seed: number | null;
  poster_image_url: string | null;
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function mapSiteSettings(row: SiteSettingsRow | null): SiteSettings {
  return {
    ...fallbackContent.settings,
    siteName: row?.site_name || fallbackContent.settings.siteName,
    tagline: row?.tagline || fallbackContent.settings.tagline,
    heroTitle: row?.hero_title || fallbackContent.settings.heroTitle,
    heroBody: row?.hero_body || fallbackContent.settings.heroBody,
    aboutTitle: row?.about_title || fallbackContent.settings.aboutTitle,
    aboutBody: row?.about_body || fallbackContent.settings.aboutBody,
    contactEmail: row?.contact_email || fallbackContent.settings.contactEmail,
    instagramUrl: row?.instagram_url || fallbackContent.settings.instagramUrl,
    footerText: row?.footer_text || fallbackContent.settings.footerText,
  };
}

function mapUpcomingShow(row: UpcomingShowRow | null): UpcomingShow {
  return {
    ...fallbackContent.upcomingShow,
    volume: row?.volume || fallbackContent.upcomingShow.volume,
    date: row?.date || fallbackContent.upcomingShow.date,
    time: row?.time || fallbackContent.upcomingShow.time,
    venue: row?.venue || fallbackContent.upcomingShow.venue,
    location: row?.location || fallbackContent.upcomingShow.location,
    description: row?.description || fallbackContent.upcomingShow.description,
    freeEntry: row?.free_entry ?? fallbackContent.upcomingShow.freeEntry,
    artists: strings(row?.artists).length ? strings(row?.artists) : fallbackContent.upcomingShow.artists,
    ctaLabel: row?.cta_label || fallbackContent.upcomingShow.ctaLabel,
    ctaEmailSubject: row?.cta_email_subject || fallbackContent.upcomingShow.ctaEmailSubject,
    ctaEmailBody: row?.cta_email_body || fallbackContent.upcomingShow.ctaEmailBody,
  };
}

function mapPastShow(row: PastShowRow): PastShow {
  return {
    id: row.id,
    volume: row.volume || '',
    date: row.date || '',
    venue: row.venue || '',
    location: row.location || '',
    artists: strings(row.artists),
    notes: row.notes || '',
    displayOrder: row.display_order ?? 0,
    visible: row.visible ?? true,
    accent: row.accent || '#d94f2b',
    seed: row.seed ?? 1,
    posterImageUrl: row.poster_image_url || '',
  };
}

function siteSettingsPayload(settings: SiteSettings) {
  return {
    id: SITE_ID,
    site_name: settings.siteName,
    tagline: settings.tagline,
    hero_title: settings.heroTitle,
    hero_body: settings.heroBody,
    about_title: settings.aboutTitle,
    about_body: settings.aboutBody,
    contact_email: settings.contactEmail,
    instagram_url: settings.instagramUrl,
    footer_text: settings.footerText,
  };
}

function upcomingShowPayload(show: UpcomingShow) {
  return {
    id: UPCOMING_ID,
    volume: show.volume,
    date: show.date,
    time: show.time,
    venue: show.venue,
    location: show.location,
    description: show.description,
    free_entry: show.freeEntry,
    artists: show.artists,
    cta_label: show.ctaLabel,
    cta_email_subject: show.ctaEmailSubject,
    cta_email_body: show.ctaEmailBody,
  };
}

function pastShowPayload(show: PastShow) {
  return {
    id: show.id,
    volume: show.volume,
    date: show.date,
    venue: show.venue,
    location: show.location,
    artists: show.artists,
    notes: show.notes,
    display_order: show.displayOrder,
    visible: show.visible,
    accent: show.accent,
    seed: show.seed,
    poster_image_url: show.posterImageUrl,
  };
}

export async function loadContent(includeHidden = false): Promise<ContentLoadResult> {
  if (!hasSupabaseConfig || !supabase) {
    return { content: fallbackContent, source: 'fallback', error: 'Supabase environment variables are not configured.' };
  }

  try {
    const [settingsResult, upcomingResult, pastResult] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', SITE_ID).maybeSingle(),
      supabase.from('upcoming_show').select('*').eq('id', UPCOMING_ID).maybeSingle(),
      supabase.from('past_shows').select('*').order('display_order', { ascending: true }),
    ]);

    if (settingsResult.error) throw settingsResult.error;
    if (upcomingResult.error) throw upcomingResult.error;
    if (pastResult.error) throw pastResult.error;

    const pastShows = ((pastResult.data || []) as PastShowRow[])
      .map(mapPastShow)
      .filter((show) => includeHidden || show.visible);

    return {
      content: {
        settings: mapSiteSettings(settingsResult.data as SiteSettingsRow | null),
        upcomingShow: mapUpcomingShow(upcomingResult.data as UpcomingShowRow | null),
        pastShows: pastShows.length ? pastShows : fallbackContent.pastShows,
      },
      source: 'supabase',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load Supabase content.';
    return { content: fallbackContent, source: 'fallback', error: message };
  }
}

export async function saveContent(content: SiteContent) {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');

  const settingsResult = await supabase
    .from('site_settings')
    .upsert(siteSettingsPayload(content.settings), { onConflict: 'id' });
  if (settingsResult.error) throw settingsResult.error;

  const upcomingResult = await supabase
    .from('upcoming_show')
    .upsert(upcomingShowPayload(content.upcomingShow), { onConflict: 'id' });
  if (upcomingResult.error) throw upcomingResult.error;

  const pastResult = await supabase.from('past_shows').upsert(content.pastShows.map(pastShowPayload), { onConflict: 'id' });
  if (pastResult.error) throw pastResult.error;
}

export async function deletePastShow(id: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const result = await supabase.from('past_shows').delete().eq('id', id);
  if (result.error) throw result.error;
}
