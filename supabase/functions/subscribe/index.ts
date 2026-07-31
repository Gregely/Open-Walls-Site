// Supabase Edge Function — subscribe
// Handles two actions via POST body:
//   { email }           → subscribe email to MailerLite group
//   { action: 'stats' } → return subscriber count (admin use)
//
// Secrets required (set in Supabase dashboard → Project Settings → Edge Functions):
//   MAILERLITE_API_KEY  — MailerLite API key (v3 / "New" API)
//   MAILERLITE_GROUP_ID — MailerLite group ID for "Open Walls Updates"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ML_API = 'https://connect.mailerlite.com/api';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const apiKey = Deno.env.get('MAILERLITE_API_KEY');
  const groupId = Deno.env.get('MAILERLITE_GROUP_ID');

  if (!apiKey || !groupId) {
    return json({ error: 'Newsletter is not configured.' }, 500);
  }

  const mlHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  // ── Stats action (admin panel subscriber count) ──────────────────────────
  if (body.action === 'stats') {
    try {
      const res = await fetch(`${ML_API}/groups/${groupId}`, { headers: mlHeaders });
      if (!res.ok) return json({ count: null });
      const data = await res.json();
      return json({ count: (data.data?.active_count as number) ?? null });
    } catch {
      return json({ count: null });
    }
  }

  // ── Subscribe action ─────────────────────────────────────────────────────
  const email = ((body.email as string) ?? '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  // Check whether subscriber already exists and is active in this group.
  try {
    const checkRes = await fetch(`${ML_API}/subscribers/${encodeURIComponent(email)}`, {
      headers: mlHeaders,
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      const subscriber = existing.data as {
        status?: string;
        groups?: { id: string }[];
      } | null;
      const inGroup = subscriber?.groups?.some((g) => g.id === groupId);
      if (inGroup && subscriber?.status === 'active') {
        return json({ status: 'already_subscribed' });
      }
    }
  } catch {
    // If the check fails, attempt to subscribe anyway.
  }

  // Add subscriber to group.
  try {
    const res = await fetch(`${ML_API}/subscribers`, {
      method: 'POST',
      headers: mlHeaders,
      body: JSON.stringify({ email, groups: [groupId] }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('MailerLite subscribe error:', err);
      return json({ error: 'Could not subscribe. Please try again.' }, 502);
    }
    return json({ status: 'subscribed' });
  } catch (err) {
    console.error('Subscribe error:', err);
    return json({ error: 'Could not subscribe. Please try again.' }, 500);
  }
});
