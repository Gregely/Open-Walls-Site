/**
 * imageUrl.ts — poster image URL utilities for Open Walls Cork.
 *
 * resolveImageUrl()
 *   Converts a user-pasted URL into a form that can be used directly as an
 *   <img src>. Handles common Google Drive share-link formats.
 *
 * IMPORTANT — Google Drive files MUST be shared as "Anyone with the link can
 * view" (or "Anyone on the internet can view"). Private files or files that
 * require sign-in will not display on the public site.
 *
 * Supported Google Drive formats:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?export=view&id=FILE_ID   ← already resolved
 *
 * All other URLs (direct image links etc.) are returned unchanged.
 *
 * Limitation: Google's /uc?export=view endpoint is rate-limited and may
 * occasionally serve an HTML warning page instead of the image for high-
 * traffic sites. For a production site, consider re-hosting on Cloudinary,
 * Imgur, or another CDN.
 */

// Matches the file ID segment in a /file/d/FILE_ID/... URL.
const GD_FILE_RE = /drive\.google\.com\/file\/d\/([^/?#]+)/;

// Matches the id param in a /open?id=FILE_ID or /open?...&id=FILE_ID URL.
const GD_OPEN_RE = /drive\.google\.com\/open\?(?:[^#]*&)?id=([^&#]+)/;

// Recognises an already-resolved Google Drive uc export link.
const GD_UC_RE = /drive\.google\.com\/uc\?/;

export function resolveImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return '';

  // Already a Google Drive uc export link — return as-is.
  if (GD_UC_RE.test(url)) return url;

  // https://drive.google.com/file/d/FILE_ID/view?...
  const fileMatch = url.match(GD_FILE_RE);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  }

  // https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(GD_OPEN_RE);
  if (openMatch) {
    return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  }

  // Assume it is a direct image URL — return unchanged.
  return url;
}

/**
 * Returns true if the URL is empty (field is optional) or looks like a valid
 * http/https URL. Returns false for obviously invalid strings.
 */
export function isValidPosterUrl(url: string): boolean {
  if (!url.trim()) return true; // empty is fine
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
