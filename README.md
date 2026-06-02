# Open Walls Cork

A Vite + React + TypeScript site for Open Walls Cork, with a Supabase-backed admin panel and native artist application form.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

The production build is written to `dist/`.

---

## Artist Application Form (`/apply`)

### Overview

The site has a native application form at `/apply` that replaces the previous Google Form flow. Artists fill in the form directly on the site — no external redirect, no Google account required.

Submissions are stored in the `applications` table in Supabase. No files are uploaded; the form collects text answers only.

### Form questions

The form matches the original Open Walls artist application exactly:

1. Name *(required)*
2. Phone number *(required)* — for the group chat
3. Email *(required)*
4. What type of art is your art?
5. What size is your work, or how many of them do you have?
6. How will you display your work?
7. Would you like social media promotion? (Yes pleases / No thanku)
8. Social media username (if yes above)
9. Any other ideas or questions?

### Spam protection

A hidden honeypot field is included. If a bot fills it, the form returns a fake success message without writing to Supabase.

### Success message

> Thank you for applying!❤️  
> We'll get back to you in the next few days with the results of the applications :)

### Closed / full message (for reference)

If the show is full, update the CTA or temporarily redirect `/apply` to the homepage. The copy to use:

> Sorry guys, this show is now full! Keep an eye on our whatsapp/instagram for cancellations if you'd still like to join!

---

## Setting Up the Database

### First-time setup

Run the full `supabase/schema.sql` in the Supabase SQL editor. This creates all tables including `applications`.

### Adding `applications` to an existing project

If the other tables already exist, run only the applications section in the Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  phone_number text NOT NULL,
  email text NOT NULL,
  art_type text,
  work_size_or_count text,
  display_method text,
  wants_social_promotion text,
  social_username text,
  other_ideas_or_questions text,
  status text NOT NULL DEFAULT 'new',
  organiser_notes text
);

-- Trigger to keep updated_at current
CREATE TRIGGER applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit; only authenticated admins can read/edit/delete
CREATE POLICY "Anyone can submit an application"
  ON public.applications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can manage applications"
  ON public.applications FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
```

### RLS summary

| Role | Select | Insert | Update | Delete |
|------|--------|--------|--------|--------|
| `anon` (public) | ❌ | ✅ | ❌ | ❌ |
| `authenticated` (admin) | ✅ | ✅ | ✅ | ✅ |

---

## Reviewing Applications (Admin)

1. Go to `/admin` and log in with your Supabase email + password.
2. **Applications** is the first section — it loads automatically.
3. The count badge shows how many have status **new**.

### What you can do

- **Filter by status** — click New / Reviewed / Accepted / Rejected / Waitlist
- **Change status** — use the dropdown on each application card; saves immediately
- **Copy email or phone** — click the Copy button next to each contact field
- **Add organiser notes** — type in the notes box and click Save notes
- **Delete** — click Delete and confirm in the modal; permanent, cannot be undone
- **Reload** — click Reload to fetch the latest submissions

### Application statuses

| Status | Meaning |
|--------|---------|
| `new` | Just submitted, not yet looked at |
| `reviewed` | You've seen it |
| `accepted` | Artist confirmed for this show |
| `rejected` | Not this time |
| `waitlist` | Spare spot if someone drops out |

---

## Admin Panel (`/admin`)

Log in with a Supabase email + password (no separate account — uses Supabase Auth).

Sections:
- **Applications** — review and manage artist applications
- **Site Text** — hero copy, about text, tagline, footer
- **Upcoming Show** — date, time, venue, artist lineup
- **Past Shows** — add/edit/delete past show records (with optional poster image URL)
- **Contact Links** — email and Instagram URL

---

## Edit Site Content

When Supabase is not configured, the site falls back to the content defined in:

```text
src/data/content.ts
```

The colorful stacked-square motif is reusable React code in:

```text
src/components/MotifStack.tsx
```

---

## Assets and Fonts

Production assets live in `public/`.

- `public/fonts/TypeFaceGrid.ttf` — custom display font from the design handoff
- `public/favicon.svg` — placeholder favicon using the Open Walls square motif

If the font licence changes, replace it in `public/fonts/` and update the `@font-face` rule in `src/styles.css`.

---

## Design Handoff

The original exported prototype is preserved under `design-handoff/` for reference only. The production app does not import the prototype's CDN scripts, Babel, or tweak panel.
