import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize post HTML before rendering. Defense-in-depth: the backend already
 * sanitizes on write (bluemonday), this guards the render call site.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}

const SAFE_SCHEMES = ["http:", "https:", "mailto:"];

/** Return the url only when it uses a safe scheme, else undefined. */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, "http://local");
    if (SAFE_SCHEMES.includes(parsed.protocol)) return url;
  } catch {
    return undefined;
  }
  return undefined;
}
