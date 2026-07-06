"use server";

import { revalidateTag } from "next/cache";
import { API_BASE_URL } from "@/lib/config/site";
import type { ApiEnvelope, PostViewStats } from "@/types/api";

/**
 * Server action invoked by <ViewTracker /> from the browser when a post is read.
 * Sends POST /api/v1/posts/:slug/view from the server side.
 */
export async function recordPostViewAction(slug: string): Promise<{ ok: boolean; stats?: PostViewStats }> {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const env = (await res.json()) as ApiEnvelope<PostViewStats>;
    if (env.success && env.data) {
      // Revalidate ISR cache tag for this post's view stats so fresh requests get updated count
      revalidateTag(`views:${slug}`, { expire: 0 });
      return { ok: true, stats: env.data };
    }
    return { ok: false };
  } catch (err) {
    console.error("[views] recordPostViewAction failed:", err instanceof Error ? err.message : err);
    return { ok: false };
  }
}

/**
 * Server action to fetch view statistics for an article (invoked by ViewStatsDialog in admin).
 */
export async function getPostViewsAction(slug: string): Promise<PostViewStats | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${encodeURIComponent(slug)}/views`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const env = (await res.json()) as ApiEnvelope<PostViewStats>;
    return env.success && env.data ? env.data : null;
  } catch (err) {
    console.error("[views] getPostViewsAction failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

