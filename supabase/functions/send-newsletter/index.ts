// Supabase Edge Function — send-newsletter
// Creates and immediately schedules a MailerLite campaign from an Update.
// Requires the caller to be an authenticated admin (JWT verified).
//
// Secrets required:
//   MAILERLITE_API_KEY      — MailerLite API key (v3 / "New" API)
//   MAILERLITE_GROUP_ID     — MailerLite group to send to
//   MAILERLITE_SENDER_EMAIL — Verified sender email in MailerLite
//   MAILERLITE_SENDER_NAME  — Sender display name (default: "Open Walls Cork")
//   SITE_URL                — Public site URL (e.g. https://openwallscork.ie)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

type SendPayload = {
  subject: string;
  previewText?: string;
  title: string;
  imageUrl?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  slug: string;
};

function buildEmailHtml(opts: SendPayload & { updateUrl: string }): string {
  const { title, imageUrl, body, ctaLabel, ctaUrl, updateUrl, previewText } = opts;

  const bodyParas = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;line-height:1.6;color:#241019;font-family:'Space Grotesk',Arial,sans-serif;font-size:16px;">${p}</p>`,
    )
    .join('');

  const imageBlock = imageUrl
    ? `<img src="${imageUrl}" alt="${title}" width="600" style="width:100%;max-width:600px;display:block;border-bottom:3px solid #241019;" />`
    : '';

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<a href="${ctaUrl}" style="display:inline-block;background:#241019;color:#fcfaf4;font-family:Arial,sans-serif;font-weight:700;font-size:15px;padding:12px 22px;text-decoration:none;margin-right:8px;margin-bottom:8px;">${ctaLabel}</a>`
      : '';

  const readMore = `<a href="${updateUrl}" style="display:inline-block;background:#fcfaf4;color:#241019;font-family:Arial,sans-serif;font-weight:700;font-size:15px;padding:12px 22px;text-decoration:none;border:3px solid #241019;margin-bottom:8px;">Read full update →</a>`;

  const previewSnippet = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:20px;background:#f4eee2;font-family:'Space Grotesk',Arial,sans-serif;">
${previewSnippet}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;background:#fcfaf4;border:3px solid #241019;border-top-width:7px;border-top-color:#5b4fa0;">
        <tr>
          <td>${imageBlock}</td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#3a2630;font-family:Arial,sans-serif;font-weight:700;">Open Walls Cork</p>
            <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;line-height:1.1;color:#241019;font-family:Arial,sans-serif;">${title}</h1>
            ${bodyParas}
            <div style="margin-top:24px;">
              ${ctaBlock}${readMore}
            </div>
          </td>
        </tr>
        <tr>
          <td style="border-top:3px solid #241019;padding:16px 32px;background:#f4eee2;">
            <p style="margin:0;font-size:12px;color:#3a2630;font-family:Arial,sans-serif;">
              You received this because you subscribed to Open Walls Cork updates.
              <a href="{$unsubscribe}" style="color:#3a2630;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  // ── Auth check: require a real user JWT, not just the anon key ─────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!supabaseUrl || !serviceRoleKey || !token) {
    return json({ error: 'Authentication required.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !user) {
    return json({ error: 'Authentication required.' }, 401);
  }

  // ── Configuration ────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('MAILERLITE_API_KEY');
  const groupId = Deno.env.get('MAILERLITE_GROUP_ID');
  const senderEmail = Deno.env.get('MAILERLITE_SENDER_EMAIL') ?? '';
  const senderName = Deno.env.get('MAILERLITE_SENDER_NAME') ?? 'Open Walls Cork';
  const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');

  if (!apiKey || !groupId || !senderEmail) {
    return json({ error: 'Newsletter is not fully configured. Check edge function secrets.' }, 500);
  }

  // ── Parse payload ────────────────────────────────────────────────────────
  let payload: SendPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  if (!payload.subject || !payload.title || !payload.slug) {
    return json({ error: 'Missing required fields: subject, title, slug.' }, 400);
  }

  const updateUrl = `${siteUrl}/updates/${payload.slug}`;
  const html = buildEmailHtml({ ...payload, updateUrl });

  const mlHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // ── Create campaign ──────────────────────────────────────────────────────
  let campaignId: string;
  try {
    const createRes = await fetch(`${ML_API}/campaigns`, {
      method: 'POST',
      headers: mlHeaders,
      body: JSON.stringify({
        name: `Open Walls Update: ${payload.title}`,
        type: 'regular',
        emails: [
          {
            subject: payload.subject,
            from_name: senderName,
            from: senderEmail,
            content: html,
          },
        ],
        groups: [groupId],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error('MailerLite campaign create error:', err);
      return json({ error: 'Could not create campaign. Check MailerLite API configuration.' }, 502);
    }

    const createData = await createRes.json();
    campaignId = createData.data?.id as string;
    if (!campaignId) {
      return json({ error: 'Campaign created but ID was missing in response.' }, 502);
    }
  } catch (err) {
    console.error('Campaign create error:', err);
    return json({ error: 'Could not create campaign.' }, 500);
  }

  // ── Schedule for immediate delivery ─────────────────────────────────────
  try {
    const schedRes = await fetch(`${ML_API}/campaigns/${campaignId}/schedule`, {
      method: 'POST',
      headers: mlHeaders,
      body: JSON.stringify({ delivery: 'instant' }),
    });

    if (!schedRes.ok) {
      const err = await schedRes.json().catch(() => ({}));
      console.error('MailerLite schedule error:', err);
      return json(
        {
          error:
            'Campaign was created but could not be scheduled. Check the MailerLite dashboard.',
          campaignId,
        },
        502,
      );
    }

    return json({ status: 'sent', campaignId });
  } catch (err) {
    console.error('Campaign schedule error:', err);
    return json({ error: 'Campaign created but could not be sent.', campaignId }, 500);
  }
});
