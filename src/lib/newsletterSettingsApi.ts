import type { NewsletterSettings } from '../types/newsletterSettings';
import { DEFAULT_NEWSLETTER_SETTINGS } from '../types/newsletterSettings';
import { hasSupabaseConfig, supabase } from './supabase';

const SETTINGS_ID = 'default';

type NewsletterSettingsRow = {
  id: string;
  heading: string | null;
  subheading: string | null;
  success_message: string | null;
  already_subscribed_message: string | null;
  failure_message: string | null;
  button_text: string | null;
  disclaimer: string | null;
};

function mapRow(row: NewsletterSettingsRow | null): NewsletterSettings {
  const d = DEFAULT_NEWSLETTER_SETTINGS;
  return {
    heading: row?.heading ?? d.heading,
    subheading: row?.subheading ?? d.subheading,
    successMessage: row?.success_message ?? d.successMessage,
    alreadySubscribedMessage: row?.already_subscribed_message ?? d.alreadySubscribedMessage,
    failureMessage: row?.failure_message ?? d.failureMessage,
    buttonText: row?.button_text ?? d.buttonText,
    disclaimer: row?.disclaimer ?? d.disclaimer,
  };
}

export async function loadNewsletterSettings(): Promise<NewsletterSettings> {
  if (!hasSupabaseConfig || !supabase) return DEFAULT_NEWSLETTER_SETTINGS;
  try {
    const { data, error } = await supabase
      .from('newsletter_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .maybeSingle();
    if (error) throw error;
    return mapRow(data as NewsletterSettingsRow | null);
  } catch {
    return DEFAULT_NEWSLETTER_SETTINGS;
  }
}

export async function saveNewsletterSettings(settings: NewsletterSettings): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase
    .from('newsletter_settings')
    .upsert(
      {
        id: SETTINGS_ID,
        heading: settings.heading,
        subheading: settings.subheading,
        success_message: settings.successMessage,
        already_subscribed_message: settings.alreadySubscribedMessage,
        failure_message: settings.failureMessage,
        button_text: settings.buttonText,
        disclaimer: settings.disclaimer,
      },
      { onConflict: 'id' },
    );
  if (error) throw error;
}
