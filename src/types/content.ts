export type SiteSettings = {
  siteName: string;
  tagline: string;
  heroTitle: string;
  heroBody: string;
  aboutTitle: string;
  aboutBody: string;
  contactEmail: string;
  instagramUrl: string;
  footerText: string;
};

export type UpcomingShow = {
  volume: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  description: string;
  freeEntry: boolean;
  artists: string[];
  ctaLabel: string;
  ctaEmailSubject: string;
  ctaEmailBody: string;
  /** When false the Apply button is greyed out and non-clickable on the public site. */
  applicationsOpen: boolean;
  /** Label for the secondary "Find out more" button. Falls back to 'Find out more'. */
  findOutMoreLabel: string;
  /** Href for the secondary button. Supports internal paths and external URLs. Falls back to '/#about'. */
  findOutMoreUrl: string;
};

export type ArtistPromoImage = {
  id: string;
  url: string;
  caption: string;
  alt: string;
};

export type ArtistPromo = {
  id: string;
  artistName: string;
  socialUrl: string;
  description: string;
  images: ArtistPromoImage[];
  visible: boolean;
  displayOrder: number;
};

export type EventPhoto = {
  id: string;
  url: string;
  caption: string;
  credit: string;
  alt: string;
  visible: boolean;
  displayOrder: number;
};

export type PastShow = {
  id: string;
  volume: string;
  date: string;
  venue: string;
  location: string;
  artists: string[];
  notes: string;
  displayOrder: number;
  visible: boolean;
  accent: string;
  seed: number;
  /** Public Google Drive share link or direct image URL. Empty string = no image. */
  posterImageUrl: string;
  artistPromos: ArtistPromo[];
  eventPhotos: EventPhoto[];
};

export type SiteContent = {
  settings: SiteSettings;
  upcomingShow: UpcomingShow;
  pastShows: PastShow[];
};

export type ContentLoadResult = {
  content: SiteContent;
  source: 'supabase' | 'fallback';
  error?: string;
};
