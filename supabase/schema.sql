create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create table if not exists public.site_settings (
  id text primary key default 'default',
  site_name text not null,
  tagline text not null default '',
  hero_title text not null,
  hero_body text not null,
  about_title text not null,
  about_body text not null default '',
  contact_email text not null,
  instagram_url text not null default '',
  -- Donation link. Empty string hides the Donate button on the public site.
  -- Migration (run in Supabase SQL editor if this column does not exist yet):
  --   ALTER TABLE public.site_settings
  --     ADD COLUMN IF NOT EXISTS donate_url text NOT NULL DEFAULT 'https://ko-fi.com/openwalls';
  donate_url text not null default 'https://ko-fi.com/openwalls',
  footer_text text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.upcoming_show (
  id text primary key default 'current',
  volume text not null,
  date text not null,
  time text not null,
  venue text not null,
  location text not null default '',
  description text not null default '',
  free_entry boolean not null default true,
  artists jsonb not null default '[]'::jsonb,
  cta_label text not null default 'Get your spot',
  cta_email_subject text not null default '',
  cta_email_body text not null default '',
  -- Controls whether the Apply button on the public site is active.
  -- Set to false when applications are closed or the show is full.
  applications_open boolean not null default true,
  -- Editable "Find out more" secondary button on the hero section.
  -- Migration (run in Supabase SQL editor if these columns don't exist yet):
  --   ALTER TABLE public.upcoming_show
  --     ADD COLUMN IF NOT EXISTS find_out_more_label text NOT NULL DEFAULT 'Find out more',
  --     ADD COLUMN IF NOT EXISTS find_out_more_url   text NOT NULL DEFAULT '/#about';
  find_out_more_label text not null default 'Find out more',
  find_out_more_url   text not null default '/#about',
  updated_at timestamptz not null default now()
);

create table if not exists public.past_shows (
  id text primary key default gen_random_uuid()::text,
  volume text not null,
  date text not null,
  venue text not null,
  location text not null default '',
  artists jsonb not null default '[]'::jsonb,
  notes text not null default '',
  display_order integer not null default 0,
  visible boolean not null default true,
  accent text not null default '#d94f2b',
  seed integer not null default 1,
  -- Public Google Drive share link or direct image URL for the show poster.
  -- Must be publicly viewable ("Anyone with the link") to display on the site.
  poster_image_url text not null default '',
  -- Archive media — added after initial launch.
  -- Run the migration below before deploying the archive feature:
  --   ALTER TABLE public.past_shows
  --     ADD COLUMN IF NOT EXISTS artist_promos jsonb NOT NULL DEFAULT '[]'::jsonb,
  --     ADD COLUMN IF NOT EXISTS event_photos  jsonb NOT NULL DEFAULT '[]'::jsonb;
  artist_promos jsonb not null default '[]'::jsonb,
  event_photos  jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists upcoming_show_updated_at on public.upcoming_show;
create trigger upcoming_show_updated_at
before update on public.upcoming_show
for each row execute function public.set_updated_at();

drop trigger if exists past_shows_updated_at on public.past_shows;
create trigger past_shows_updated_at
before update on public.past_shows
for each row execute function public.set_updated_at();

-- ── Applications table ────────────────────────────────────────────────────
-- Stores artist applications submitted via /apply.
-- Status lifecycle: new → reviewed → accepted / rejected / waitlist
--
-- NOTE: If you already ran this schema and are adding applications for the
-- first time, run the following in the Supabase SQL editor instead:
--
--   CREATE TABLE IF NOT EXISTS public.applications ( ... );
--
-- The full definition is below.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Required fields (match Google Form required questions)
  name text not null,
  phone_number text not null,
  email text not null,
  -- Optional fields (may be null if the applicant left them blank)
  art_type text,
  work_size_or_count text,
  display_method text,
  wants_social_promotion text,   -- 'Yes pleases' | 'No thanku' | null
  social_username text,
  other_ideas_or_questions text,
  -- Admin fields
  status text not null default 'new',   -- new | reviewed | accepted | rejected | waitlist
  organiser_notes text
);

drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

alter table public.applications enable row level security;

-- Anonymous users can submit applications but cannot read them.
drop policy if exists "Anyone can submit an application" on public.applications;
create policy "Anyone can submit an application"
on public.applications
for insert
to anon, authenticated
with check (true);

-- Only authenticated admin users can read, update, or delete applications.
drop policy if exists "Authenticated users can manage applications" on public.applications;
create policy "Authenticated users can manage applications"
on public.applications
for all
to authenticated
using (true)
with check (true);

-- ── End applications table ─────────────────────────────────────────────────

alter table public.site_settings enable row level security;
alter table public.upcoming_show enable row level security;
alter table public.past_shows enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read upcoming show" on public.upcoming_show;
create policy "Public can read upcoming show"
on public.upcoming_show
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read visible past shows" on public.past_shows;
create policy "Public can read visible past shows"
on public.past_shows
for select
to anon, authenticated
using (visible = true or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage site settings" on public.site_settings;
create policy "Authenticated users can manage site settings"
on public.site_settings
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage upcoming show" on public.upcoming_show;
create policy "Authenticated users can manage upcoming show"
on public.upcoming_show
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage past shows" on public.past_shows;
create policy "Authenticated users can manage past shows"
on public.past_shows
for all
to authenticated
using (true)
with check (true);

insert into public.site_settings (
  id,
  site_name,
  tagline,
  hero_title,
  hero_body,
  about_title,
  about_body,
  contact_email,
  instagram_url,
  footer_text
) values (
  'default',
  'Open Walls',
  'Monthly exhibition + maker''s market · Cork',
  'Sat 28 June',
  'One room, one day, wall to wall. Twenty-odd Cork artists hang original work, prints and zines beside a maker''s market - with coffee, records and the odd pint. Roll in, look around, take something home.',
  'A wall is just a gallery that hasn''t been asked yet.',
  'Open Walls is a Cork-based visual art collective. Once a month we borrow a room somewhere in the city and fill it, wall to wall, with work from local artists - paintings, prints, photography, zines - next to a maker''s market and a bit of music.

No white-cube hush, no entry fee, no gatekeeping. If you make things in Cork, there''s a wall here with your name on it.',
  'openwallscork@gmail.com',
  'https://instagram.com/openwallscork',
  'Cork, Ireland · Monthly · Free entry · Bring a friend.'
) on conflict (id) do update set
  site_name = excluded.site_name,
  tagline = excluded.tagline,
  hero_title = excluded.hero_title,
  hero_body = excluded.hero_body,
  about_title = excluded.about_title,
  about_body = excluded.about_body,
  contact_email = excluded.contact_email,
  instagram_url = excluded.instagram_url,
  footer_text = excluded.footer_text;

insert into public.upcoming_show (
  id,
  volume,
  date,
  time,
  venue,
  location,
  description,
  free_entry,
  artists,
  cta_label,
  cta_email_subject,
  cta_email_body,
  applications_open
) values (
  'current',
  'Vol. 12',
  'Sat 28 June',
  '12-6pm',
  'The Guesthouse',
  'MacCurtain St, Cork',
  'One room, one day, wall to wall. Twenty-odd Cork artists hang original work, prints and zines beside a maker''s market - with coffee, records and the odd pint. Roll in, look around, take something home.',
  true,
  '["Thady Tra", "Evan Stout", "Andrew Carroll", "Victoria Cialkosz", "Isabel Quinn", "Sachiko Kobayashi", "+ many more"]'::jsonb,
  'Get your spot',
  'Open Walls Vol. 12 - artist application',
  '',
  true
) on conflict (id) do update set
  volume = excluded.volume,
  date = excluded.date,
  time = excluded.time,
  venue = excluded.venue,
  location = excluded.location,
  description = excluded.description,
  free_entry = excluded.free_entry,
  artists = excluded.artists,
  cta_label = excluded.cta_label,
  cta_email_subject = excluded.cta_email_subject,
  cta_email_body = excluded.cta_email_body,
  applications_open = excluded.applications_open;

insert into public.past_shows (id, volume, date, venue, location, artists, notes, display_order, visible, accent, seed, poster_image_url) values
  ('vol-11', 'Vol. 11', 'May 2026', 'Nash 19', 'Princes St', '[]'::jsonb, '', 10, true, '#d94f2b', 12, ''),
  ('vol-10', 'Vol. 10', 'Apr 2026', 'The Guesthouse', 'MacCurtain', '[]'::jsonb, '', 20, true, '#2aa8a0', 7, ''),
  ('vol-9', 'Vol. 9', 'Mar 2026', 'Plugd Records', 'Triskel', '[]'::jsonb, '', 30, true, '#f4821f', 23, ''),
  ('vol-8', 'Vol. 8', 'Feb 2026', 'The Kino', 'Washington St', '[]'::jsonb, '', 40, true, '#5b4fa0', 41, ''),
  ('vol-7', 'Vol. 7', 'Jan 2026', 'Sample Studios', 'Churchfield', '[]'::jsonb, '', 50, true, '#2b9fd4', 5, ''),
  ('vol-6', 'Vol. 6', 'Dec 2025', 'The Roundy', 'Castle St', '[]'::jsonb, '', 60, true, '#3fad5c', 33, ''),
  ('vol-5', 'Vol. 5', 'Nov 2025', 'Cork Coffee Roasters', '', '[]'::jsonb, '', 70, true, '#8c4f8b', 18, ''),
  ('vol-4', 'Vol. 4', 'Oct 2025', 'Crane Lane', 'Phoenix St', '[]'::jsonb, '', 80, true, '#f5c800', 9, '')
on conflict (id) do update set
  volume = excluded.volume,
  date = excluded.date,
  venue = excluded.venue,
  location = excluded.location,
  artists = excluded.artists,
  notes = excluded.notes,
  display_order = excluded.display_order,
  visible = excluded.visible,
  accent = excluded.accent,
  seed = excluded.seed,
  poster_image_url = excluded.poster_image_url;

-- ── Updates table ─────────────────────────────────────────────────────────
-- Run this migration in the Supabase SQL editor:
--
--   (copy from CREATE TABLE through the final semicolon below)
--
-- This table is separate from past_shows / site_settings so the updates
-- admin section can save each update independently without touching the
-- main site content save flow.

create table if not exists public.updates (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '',
  slug          text not null unique,
  subtitle      text not null default '',
  label         text not null default '',
  update_date   text not null default '',
  image_url     text not null default '',
  body          text not null default '',
  cta_label     text not null default '',
  cta_url       text not null default '',
  published     boolean not null default false,
  pinned        boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace trigger updates_updated_at
before update on public.updates
for each row execute function public.set_updated_at();

alter table public.updates enable row level security;

-- Public can read only published updates.
drop policy if exists "Public can read published updates" on public.updates;
create policy "Public can read published updates"
on public.updates
for select
to anon, authenticated
using (published = true or auth.role() = 'authenticated');

-- Authenticated admin can manage all updates.
drop policy if exists "Authenticated users can manage updates" on public.updates;
create policy "Authenticated users can manage updates"
on public.updates
for all
to authenticated
using (true)
with check (true);

-- ── End updates table ──────────────────────────────────────────────────────
