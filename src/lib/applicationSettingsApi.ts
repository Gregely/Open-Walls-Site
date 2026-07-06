import type { ApplicationFormType, ApplicationSettings } from '../types/applicationSettings';
import { DEFAULT_APPLICATION_SETTINGS } from '../types/applicationSettings';
import { hasSupabaseConfig, supabase } from './supabase';

const SETTINGS_ID = 'default';

type ApplicationSettingsRow = {
  id: string;
  applications_open: boolean | null;
  active_form: string | null;
  default_intro: string | null;
  default_closed_message: string | null;
  wandesford_intro: string | null;
  wandesford_guidelines: string | null;
  wandesford_legal_text: string | null;
  wandesford_closed_message: string | null;
  // Per-category text — null on rows that pre-date this column being added.
  wandesford_art_market_text: string | null;
  wandesford_installation_text: string | null;
  wandesford_video_text: string | null;
  wandesford_performance_text: string | null;
  wandesford_workshop_text: string | null;
};

function mapRow(row: ApplicationSettingsRow | null): ApplicationSettings {
  const d = DEFAULT_APPLICATION_SETTINGS;
  return {
    applicationsOpen: row?.applications_open ?? d.applicationsOpen,
    activeForm: (row?.active_form as ApplicationFormType | null) ?? d.activeForm,
    defaultIntro: row?.default_intro ?? d.defaultIntro,
    defaultClosedMessage: row?.default_closed_message ?? d.defaultClosedMessage,
    wandesfordIntro: row?.wandesford_intro ?? d.wandesfordIntro,
    wandesfordGuidelines: row?.wandesford_guidelines ?? d.wandesfordGuidelines,
    wandesfordLegalText: row?.wandesford_legal_text ?? d.wandesfordLegalText,
    wandesfordClosedMessage: row?.wandesford_closed_message ?? d.wandesfordClosedMessage,
    wandesfordArtMarketText: row?.wandesford_art_market_text ?? d.wandesfordArtMarketText,
    wandesfordInstallationText: row?.wandesford_installation_text ?? d.wandesfordInstallationText,
    wandesfordVideoText: row?.wandesford_video_text ?? d.wandesfordVideoText,
    wandesfordPerformanceText: row?.wandesford_performance_text ?? d.wandesfordPerformanceText,
    wandesfordWorkshopText: row?.wandesford_workshop_text ?? d.wandesfordWorkshopText,
  };
}

export async function loadApplicationSettings(): Promise<ApplicationSettings> {
  if (!hasSupabaseConfig || !supabase) return DEFAULT_APPLICATION_SETTINGS;
  try {
    const { data, error } = await supabase
      .from('application_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .maybeSingle();
    if (error) throw error;
    return mapRow(data as ApplicationSettingsRow | null);
  } catch (err) {
    console.error('Failed to load application settings:', err);
    return DEFAULT_APPLICATION_SETTINGS;
  }
}

export async function saveApplicationSettings(settings: ApplicationSettings): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const payload = {
    id: SETTINGS_ID,
    applications_open: settings.applicationsOpen,
    active_form: settings.activeForm,
    default_intro: settings.defaultIntro,
    default_closed_message: settings.defaultClosedMessage,
    wandesford_intro: settings.wandesfordIntro,
    wandesford_guidelines: settings.wandesfordGuidelines,
    wandesford_legal_text: settings.wandesfordLegalText,
    wandesford_closed_message: settings.wandesfordClosedMessage,
    wandesford_art_market_text: settings.wandesfordArtMarketText,
    wandesford_installation_text: settings.wandesfordInstallationText,
    wandesford_video_text: settings.wandesfordVideoText,
    wandesford_performance_text: settings.wandesfordPerformanceText,
    wandesford_workshop_text: settings.wandesfordWorkshopText,
  };
  const { error } = await supabase
    .from('application_settings')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}
