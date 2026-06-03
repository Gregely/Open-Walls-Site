import { fallbackContent } from '../data/content';
import type {
  ArtistPromo,
  ArtistPromoImage,
  ContentLoadResult,
  EventPhoto,
  PastShow,
  SiteContent,
  SiteSettings,
  UpcomingShow,
} from '../types/content';
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
  donate_url: string | null;
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
  applications_open: boolean | null;
  find_out_more_label: string | null;
  find_out_more_url: string | null;
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
  artist_promos: unknown;
  event_photos: unknown;
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function parsePromoImages(value: unknown): ArtistPromoImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const obj = item as Record<string, unknown>;
    return [{
      id: String(obj.id || crypto.randomUUID()),
      url: String(obj.url || ''),
      caption: String(obj.caption || ''),
      alt: String(obj.alt || ''),
    }];
  });
}

function parseArtistPromos(value: unknown): ArtistPromo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const obj = item as Record<string, unknown>;
    return [{
      id: String(obj.id || crypto.randomUUID()),
      artistName: String(obj.artistName || ''),
      socialUrl: String(obj.socialUrl || ''),
      description: String(obj.description || ''),
      images: parsePromoImages(obj.images),
      visible: obj.visible !== false,
      displayOrder: Number(obj.displayOrder || 0),
    }];
  });
}

function parseEventPhotos(value: unknown): EventPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const obj = item as Record<string, unknown>;
    return [{
      id: String(obj.id || crypto.randomUUID()),
      url: String(obj.url || ''),
      caption: String(obj.caption || ''),
      credit: String(obj.credit || ''),
      alt: String(obj.alt || ''),
      visible: obj.visible !== false,
      displayOrder: Number(obj.displayOrder || 0),
    }];
  });
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
    // Use ?? (not ||) so an empty string from the DB hides the button,
    // while null (pre-migration row) falls back to the default donate URL.
    donateUrl: row?.donate_url ?? fallbackContent.settings.donateUrl,
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
    // Treat null as true for backward compatibility with existing rows that
    // pre-date this column — an older row with no applications_open column
    // should behave as if applications are open.
    applicationsOpen: row?.applications_open ?? true,
    // Null means the column doesn't exist yet (pre-migration) — fall back to defaults.
    findOutMoreLabel: row?.find_out_more_label || fallbackContent.upcomingShow.findOutMoreLabel,
    findOutMoreUrl: row?.find_out_more_url || fallbackContent.upcomingShow.findOutMoreUrl,
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
    artistPromos: parseArtistPromos(row.artist_promos),
    eventPhotos: parseEventPhotos(row.event_photos),
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
    donate_url: settings.donateUrl,
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
    applications_open: show.applicationsOpen,
    find_out_more_label: show.findOutMoreLabel,
    find_out_more_url: show.findOutMoreUrl,
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
    artist_promos: show.artistPromos,
    event_photos: show.eventPhotos,
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

    // Return exactly what Supabase has — including an empty array.
    // Do NOT fall back to fallbackContent.pastShows when the list is empty:
    // the user may have intentionally deleted all past shows, and substituting
    // the 8 demo shows here was the cause of "deleted shows randomly reappear".
    // Fallback shows are only used when Supabase is unreachable (the catch block).
    return {
      content: {
        settings: mapSiteSettings(settingsResult.data as SiteSettingsRow | null),
        upcomingShow: mapUpcomingShow(upcomingResult.data as UpcomingShowRow | null),
        pastShows,
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
