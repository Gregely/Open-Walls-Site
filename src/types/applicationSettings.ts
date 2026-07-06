export type ApplicationFormType = 'default' | 'wandesford';

export const WANDESFORD_ATTENDEE_TYPES = [
  'Art Market',
  'Installation',
  'Video',
  'Performance',
  'Workshop',
] as const;

export type WandesfordAttendeeType = typeof WANDESFORD_ATTENDEE_TYPES[number];

export type ApplicationSettings = {
  applicationsOpen: boolean;
  activeForm: ApplicationFormType;
  defaultIntro: string;
  defaultClosedMessage: string;
  wandesfordIntro: string;
  wandesfordGuidelines: string;
  wandesfordLegalText: string;
  wandesfordClosedMessage: string;
  // Per-category info text shown above each category's fields on the public form.
  wandesfordArtMarketText: string;
  wandesfordInstallationText: string;
  wandesfordVideoText: string;
  wandesfordPerformanceText: string;
  wandesfordWorkshopText: string;
};

export const DEFAULT_APPLICATION_SETTINGS: ApplicationSettings = {
  applicationsOpen: true,
  activeForm: 'default',
  defaultIntro: 'Placeholder intro text. Replace this in admin.',
  defaultClosedMessage: 'Placeholder closed message. Replace this in admin.',
  wandesfordIntro: 'Placeholder event description. Replace this in admin.',
  wandesfordGuidelines: 'Placeholder application guidelines. Replace this in admin.',
  wandesfordLegalText: 'Placeholder consent text. Replace this in admin.',
  wandesfordClosedMessage: 'Placeholder closed message. Replace this in admin.',
  wandesfordArtMarketText: 'Placeholder Art Market information. Replace this in admin.',
  wandesfordInstallationText: 'Placeholder Installation information. Replace this in admin.',
  wandesfordVideoText: 'Placeholder Video information. Replace this in admin.',
  wandesfordPerformanceText: 'Placeholder Performance information. Replace this in admin.',
  wandesfordWorkshopText: 'Placeholder Workshop information. Replace this in admin.',
};
