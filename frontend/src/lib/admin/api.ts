import "server-only";
import { API_BASE_URL } from "@/lib/config/site";
import { getAccessToken, getRefreshToken, setSession, clearSession } from "@/lib/auth";
import type {
  Admin,
  ApiEnvelope,
  Category,
  LoginResponse,
  Media,
  Meta,
  Paginated,
  PostAdminSummary,
  PostDetail,
  PostInput,
  PostStatus,
  Stats,
  Tag,
  TokenResponse,
} from "@/types/api";

/** Typed error carrying the HTTP status so callers can branch (401, 409, etc.). */
export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RawResult<T> {
  data: T;
  meta?: Meta;
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

/**
 * Core authenticated request. Attaches the access token as Bearer, unwraps the
 * envelope, and on a 401 attempts a single refresh + retry before giving up.
 */
async function authedRequest<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  overrideToken?: string,
): Promise<RawResult<T>> {
  const token = overrideToken ?? (await getAccessToken());
  const isRetry = overrideToken !== undefined;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 401 && !isRetry) {
    const refreshedToken = await tryRefresh();
    // Retry with the fresh token directly — the persisted cookie may not be
    // readable yet (or writable at all during a Server Component render).
    if (refreshedToken) return authedRequest<T>(path, method, body, refreshedToken);
    await safeClearSession();
    throw new AdminApiError(401, "Unauthorized");
  }

  const envelope = await parseEnvelope<T>(res);
  if (!res.ok || !envelope?.success) {
    throw new AdminApiError(res.status, envelope?.error ?? `request failed (${res.status})`);
  }
  return { data: envelope.data as T, meta: envelope.meta };
}

/**
 * Exchange the refresh cookie for a new token pair. Returns the new access
 * token on success. Persistence via cookies only works inside a Server Action
 * or Route Handler; during a Server Component render the write is a silent
 * no-op, but the returned token still lets the current request succeed.
 */
async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  const envelope = await parseEnvelope<TokenResponse>(res);
  if (!res.ok || !envelope?.success || !envelope.data) return null;

  try {
    await setSession(envelope.data);
  } catch {
    // Cookie writes are not allowed during render; tokens persist on the next
    // action/route-handler round-trip instead.
  }
  return envelope.data.accessToken;
}

async function safeClearSession(): Promise<void> {
  try {
    await clearSession();
  } catch {
    // Not writable during render; the auth gate will redirect regardless.
  }
}

/* ---------------------------------------------------------------------------
 * Generic verbs
 * ------------------------------------------------------------------------- */

export async function adminGet<T>(path: string): Promise<T> {
  const { data } = await authedRequest<T>(path, "GET");
  return data;
}

export async function adminGetPaginated<T>(path: string): Promise<Paginated<T>> {
  const { data, meta } = await authedRequest<T[]>(path, "GET");
  const items = data ?? [];
  return {
    items,
    meta: meta ?? { page: 1, limit: items.length, total: items.length, totalPages: 1 },
  };
}

export async function adminSend<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const { data } = await authedRequest<T>(path, method, body);
  return data;
}

/** Multipart upload for media (file + altText). */
export async function adminUpload(formData: FormData): Promise<Media> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/admin/media`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
  });

  if (res.status === 401) {
    await safeClearSession();
    throw new AdminApiError(401, "Unauthorized");
  }

  const envelope = await parseEnvelope<Media>(res);
  if (!res.ok || !envelope?.success || !envelope.data) {
    throw new AdminApiError(res.status, envelope?.error ?? `upload failed (${res.status})`);
  }
  return envelope.data;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

/* ---------------------------------------------------------------------------
 * Auth
 * ------------------------------------------------------------------------- */

/** Login is unauthenticated; called from the login server action. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const envelope = await parseEnvelope<LoginResponse>(res);
  if (!res.ok || !envelope?.success || !envelope.data) {
    throw new AdminApiError(res.status, envelope?.error ?? "Invalid credentials");
  }
  return envelope.data;
}

export function me(): Promise<Admin> {
  return adminGet<Admin>("/auth/me");
}

export async function logout(): Promise<void> {
  try {
    await adminSend<null>("POST", "/auth/logout");
  } catch {
    // Best-effort server logout; cookies are cleared by the caller regardless.
  }
}

export function changePassword(currentPassword: string, newPassword: string): Promise<null> {
  return adminSend<null>("PUT", "/auth/password", { currentPassword, newPassword });
}

/* ---------------------------------------------------------------------------
 * Posts
 * ------------------------------------------------------------------------- */

export interface ListPostsParams {
  status?: PostStatus | "";
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export function listPosts(params: ListPostsParams = {}): Promise<Paginated<PostAdminSummary>> {
  return adminGetPaginated<PostAdminSummary>(`/admin/posts${qs({ ...params })}`);
}

export function getPost(id: number): Promise<PostDetail> {
  return adminGet<PostDetail>(`/admin/posts/${id}`);
}

export function createPost(input: PostInput): Promise<PostDetail> {
  return adminSend<PostDetail>("POST", "/admin/posts", input);
}

export function updatePost(id: number, input: PostInput): Promise<PostDetail> {
  return adminSend<PostDetail>("PUT", `/admin/posts/${id}`, input);
}

export function setStatus(
  id: number,
  status: PostStatus,
  publishedAt?: string | null,
): Promise<PostDetail> {
  return adminSend<PostDetail>("PATCH", `/admin/posts/${id}/status`, { status, publishedAt });
}

export function deletePost(id: number): Promise<null> {
  return adminSend<null>("DELETE", `/admin/posts/${id}`);
}

/* ---------------------------------------------------------------------------
 * Stats
 * ------------------------------------------------------------------------- */

export function getStats(): Promise<Stats> {
  return adminGet<Stats>("/admin/stats");
}

/* ---------------------------------------------------------------------------
 * Categories
 * ------------------------------------------------------------------------- */

export function listCategories(): Promise<Category[]> {
  return adminGet<Category[]>("/admin/categories");
}

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return adminSend<Category>("POST", "/admin/categories", input);
}

export function updateCategory(id: number, input: CategoryInput): Promise<Category> {
  return adminSend<Category>("PUT", `/admin/categories/${id}`, input);
}

export function deleteCategory(id: number): Promise<null> {
  return adminSend<null>("DELETE", `/admin/categories/${id}`);
}

/* ---------------------------------------------------------------------------
 * Tags
 * ------------------------------------------------------------------------- */

export function listTags(): Promise<Tag[]> {
  return adminGet<Tag[]>("/admin/tags");
}

export interface TagInput {
  name: string;
  slug?: string;
}

export function createTag(input: TagInput): Promise<Tag> {
  return adminSend<Tag>("POST", "/admin/tags", input);
}

export function updateTag(id: number, input: TagInput): Promise<Tag> {
  return adminSend<Tag>("PUT", `/admin/tags/${id}`, input);
}

export function deleteTag(id: number): Promise<null> {
  return adminSend<null>("DELETE", `/admin/tags/${id}`);
}
