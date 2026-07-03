import "server-only";
import { apiGet } from "./client";
import type { Category, Tag } from "@/types/api";

/** Resilient: empty list when the backend is unreachable. */
export async function getCategories(): Promise<Category[]> {
  try {
    return await apiGet<Category[]>("/categories", { revalidate: 300, tags: ["categories"] });
  } catch (err) {
    console.error("[api] getCategories failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getTags(): Promise<Tag[]> {
  try {
    return await apiGet<Tag[]>("/tags", { revalidate: 300, tags: ["tags"] });
  } catch (err) {
    console.error("[api] getTags failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
