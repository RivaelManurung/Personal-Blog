import { MEDIA_ORIGIN } from "@/lib/config/site";
import type { Media } from "@/types/api";

/** Resolve a (possibly relative) media URL to an absolute src for next/image. */
export function mediaSrc(media: Media | null | undefined): string | null {
  if (!media?.url) return null;
  if (media.url.startsWith("http://") || media.url.startsWith("https://")) {
    return media.url;
  }
  return `${MEDIA_ORIGIN}${media.url}`;
}
