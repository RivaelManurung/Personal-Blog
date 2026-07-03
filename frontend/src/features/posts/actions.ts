"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminApiError,
  adminUpload,
  createPost,
  deletePost,
  setStatus,
  updatePost,
} from "@/lib/admin/api";
import { getAccessToken } from "@/lib/auth";
import { postSchema } from "@/features/posts/schema";
import type { Media, PostInput, PostStatus } from "@/types/api";

export interface PostActionResult {
  ok: boolean;
  error?: string;
  /** Field-scoped error, e.g. slug conflict (409). */
  fieldErrors?: Partial<Record<"slug" | "title", string>>;
}

export interface UploadResult {
  ok: boolean;
  media?: Media;
  error?: string;
}

/** Guard: every action re-reads the token rather than trusting the client. */
async function requireAuth(): Promise<void> {
  const token = await getAccessToken();
  if (!token) redirect("/admin/login");
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

/** Normalize validated form values into the backend PostInput payload. */
function toPostInput(raw: unknown): { input?: PostInput; error?: string } {
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid post data" };
  }
  const v = parsed.data;
  const input: PostInput = {
    title: v.title,
    slug: emptyToUndefined(v.slug),
    excerpt: emptyToUndefined(v.excerpt),
    content: v.content,
    contentFormat: v.contentFormat,
    categoryId: v.categoryId ?? null,
    tagIds: v.tagIds,
    coverImageId: v.coverImageId ?? null,
    ogImageId: v.ogImageId ?? null,
    status: v.status,
    publishedAt: emptyToUndefined(v.publishedAt ?? undefined) ?? null,
    seoTitle: emptyToUndefined(v.seoTitle),
    seoDescription: emptyToUndefined(v.seoDescription),
    canonicalUrl: emptyToUndefined(v.canonicalUrl),
  };
  return { input };
}

function mapError(error: unknown): PostActionResult {
  if (error instanceof AdminApiError) {
    if (error.status === 401) redirect("/admin/login");
    if (error.status === 409) {
      return { ok: false, fieldErrors: { slug: "That slug is already in use" } };
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: error instanceof Error ? error.message : "Request failed" };
}

export async function createPostAction(raw: unknown): Promise<PostActionResult> {
  await requireAuth();
  const { input, error } = toPostInput(raw);
  if (!input) return { ok: false, error };

  let createdId: number;
  try {
    const post = await createPost(input);
    createdId = post.id;
  } catch (error: unknown) {
    return mapError(error);
  }

  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  redirect(`/admin/posts/${createdId}/edit`);
}

export async function updatePostAction(id: number, raw: unknown): Promise<PostActionResult> {
  await requireAuth();
  const { input, error } = toPostInput(raw);
  if (!input) return { ok: false, error };

  try {
    await updatePost(id, input);
  } catch (error: unknown) {
    return mapError(error);
  }

  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}/edit`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePostAction(id: number): Promise<PostActionResult> {
  await requireAuth();
  try {
    await deletePost(id);
  } catch (error: unknown) {
    return mapError(error);
  }
  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setStatusAction(
  id: number,
  status: PostStatus,
  publishedAt?: string | null,
): Promise<PostActionResult> {
  await requireAuth();
  try {
    await setStatus(id, status, publishedAt ?? null);
  } catch (error: unknown) {
    return mapError(error);
  }
  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  return { ok: true };
}

/** Upload a cover/OG image; called from the CoverImageField. */
export async function uploadMediaAction(formData: FormData): Promise<UploadResult> {
  await requireAuth();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload" };
  }
  try {
    const media = await adminUpload(formData);
    return { ok: true, media };
  } catch (error: unknown) {
    if (error instanceof AdminApiError && error.status === 401) redirect("/admin/login");
    return { ok: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}
