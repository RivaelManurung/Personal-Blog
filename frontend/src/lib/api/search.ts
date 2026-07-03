import "server-only";
import { apiGetPaginated, qs } from "./client";
import type { Paginated, SearchHit } from "@/types/api";

/** Full-text search over published posts. Dynamic (no caching). Resilient. */
export async function searchPosts(
  query: string,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<SearchHit>> {
  if (!query.trim()) {
    return { items: [], meta: { page: 1, limit: params.limit ?? 10, total: 0, totalPages: 0 } };
  }
  try {
    return await apiGetPaginated<SearchHit>(`/search${qs({ q: query, ...params })}`, {
      revalidate: false,
    });
  } catch (err) {
    console.error("[api] searchPosts failed:", err instanceof Error ? err.message : err);
    return { items: [], meta: { page: 1, limit: params.limit ?? 10, total: 0, totalPages: 0 } };
  }
}
