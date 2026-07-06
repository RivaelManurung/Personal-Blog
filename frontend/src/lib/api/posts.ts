import "server-only";
import { apiGet, apiGetPaginated, ApiError, qs } from "./client";
import type { Paginated, PostDetail, PostSummary, PostViewStats } from "@/types/api";

const LIST_REVALIDATE = 300; // 5 min ISR; on-demand revalidateTag on publish

interface ListParams {
  page?: number;
  limit?: number;
  sort?: string;
}

function emptyPage<T>(limit = 10): Paginated<T> {
  return { items: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
}


/**
 * Resilient list fetch: returns an empty page when the backend is unreachable,
 * so pages render a graceful empty state instead of failing the build/request.
 */
async function safeList<T>(fn: () => Promise<Paginated<T>>, limit?: number): Promise<Paginated<T>> {
  try {
    return await fn();
  } catch (err) {
    console.error("[api] list fetch failed:", err instanceof Error ? err.message : err);
    return emptyPage<T>(limit);
  }
}

/** Public paginated list of published posts. */
export function getPosts(params: ListParams = {}): Promise<Paginated<PostSummary>> {
  return safeList(
    () =>
      apiGetPaginated<PostSummary>(`/posts${qs({ ...params })}`, {
        revalidate: LIST_REVALIDATE,
        tags: ["posts"],
      }),
    params.limit,
  );
}

/** Featured posts for the home bento (first N published). */
export async function getFeaturedPosts(limit = 5): Promise<PostSummary[]> {
  const { items } = await getPosts({ limit, sort: "published_at desc" });
  return items;
}

/** Single published post by slug; null when not found or backend unreachable. */
export async function getPost(slug: string): Promise<PostDetail | null> {
  try {
    return await apiGet<PostDetail>(`/posts/${encodeURIComponent(slug)}`, {
      revalidate: LIST_REVALIDATE,
      tags: ["posts", `post:${slug}`],
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    console.error("[api] getPost failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function getPostsByCategory(slug: string, params: ListParams = {}): Promise<Paginated<PostSummary>> {
  return safeList(
    () =>
      apiGetPaginated<PostSummary>(`/categories/${encodeURIComponent(slug)}/posts${qs({ ...params })}`, {
        revalidate: LIST_REVALIDATE,
        tags: ["posts", `category:${slug}`],
      }),
    params.limit,
  );
}

export function getPostsByTag(slug: string, params: ListParams = {}): Promise<Paginated<PostSummary>> {
  return safeList(
    () =>
      apiGetPaginated<PostSummary>(`/tags/${encodeURIComponent(slug)}/posts${qs({ ...params })}`, {
        revalidate: LIST_REVALIDATE,
        tags: ["posts", `tag:${slug}`],
      }),
    params.limit,
  );
}

export async function getPostViews(slug: string): Promise<PostViewStats | null> {
  try {
    return await apiGet<PostViewStats>(`/posts/${encodeURIComponent(slug)}/views`, {
      revalidate: LIST_REVALIDATE,
      tags: ["posts", `views:${slug}`],
    });
  } catch (err) {
    console.error("[api] getPostViews failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

