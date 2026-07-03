import "server-only";
import { API_BASE_URL } from "@/lib/config/site";
import type { ApiEnvelope, Meta, Paginated } from "@/types/api";

/** Thrown on non-2xx responses; carries the HTTP status for handlers. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  /** ISR revalidation window (seconds). Omit for no explicit caching. */
  revalidate?: number | false;
  /** Cache tags for on-demand revalidateTag(). */
  tags?: string[];
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: Meta }> {
  const { method = "GET", body, token, revalidate, tags } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const next =
    revalidate === undefined && !tags ? undefined : { revalidate: revalidate ?? undefined, tags };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...(next ? { next } : {}),
    ...(revalidate === undefined && !tags ? { cache: "no-store" } : {}),
  });

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to status-based error
  }

  if (!res.ok || !envelope?.success) {
    throw new ApiError(res.status, envelope?.error ?? `request failed (${res.status})`);
  }
  return { data: envelope.data as T, meta: envelope.meta };
}

/** GET returning just the data payload. */
export async function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  const { data } = await request<T>(path, { ...opts, method: "GET" });
  return data;
}

/** GET returning a paginated collection (data + meta). */
export async function apiGetPaginated<T>(path: string, opts?: RequestOptions): Promise<Paginated<T>> {
  const { data, meta } = await request<T[]>(path, { ...opts, method: "GET" });
  return {
    items: data ?? [],
    meta: meta ?? { page: 1, limit: (data ?? []).length, total: (data ?? []).length, totalPages: 1 },
  };
}

/** Mutating request (admin, requires token). Returns the data payload. */
export async function apiMutate<T>(path: string, opts: RequestOptions): Promise<T> {
  const { data } = await request<T>(path, opts);
  return data;
}

/** Build a querystring from a params object (skips null/undefined/empty). */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}
