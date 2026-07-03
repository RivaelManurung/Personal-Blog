import { SITE } from "@/lib/config/site";
import type { Media } from "@/types/api";

/**
 * Resolve a media URL to a src for browsers and next/image.
 * Returns relative paths (e.g. "/uploads/...") untouched so they load
 * same-origin via Next.js rewrites without CORS or Private Network Access issues.
 */
export function mediaSrc(media: Media | null | undefined): string | null {
  if (!media?.url) return null;
  if (media.url.startsWith("http://") || media.url.startsWith("https://")) {
    return media.url;
  }
  return media.url;
}

/**
 * Resolve an absolute media URL for SEO metadata and JSON-LD schemas.
 */
export function absoluteMediaSrc(media: Media | null | undefined): string | null {
  if (!media?.url) return null;
  if (media.url.startsWith("http://") || media.url.startsWith("https://")) {
    return media.url;
  }
  return `${SITE.url}${media.url}`;
}

