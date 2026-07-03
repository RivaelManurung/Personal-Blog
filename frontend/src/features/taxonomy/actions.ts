"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminApiError,
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  updateCategory,
  updateTag,
  type CategoryInput,
  type TagInput,
} from "@/lib/admin/api";
import { getAccessToken } from "@/lib/auth";
import { categorySchema, tagSchema } from "@/features/taxonomy/schema";

export interface TaxonomyResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"slug" | "name", string>>;
}

async function requireAuth(): Promise<void> {
  const token = await getAccessToken();
  if (!token) redirect("/admin/login");
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function mapError(error: unknown): TaxonomyResult {
  if (error instanceof AdminApiError) {
    if (error.status === 401) redirect("/admin/login");
    if (error.status === 409) return { ok: false, fieldErrors: { slug: "That slug is already in use" } };
    return { ok: false, error: error.message };
  }
  return { ok: false, error: error instanceof Error ? error.message : "Request failed" };
}

/* ---- Categories ---- */

export async function saveCategoryAction(id: number | null, raw: unknown): Promise<TaxonomyResult> {
  await requireAuth();
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const input: CategoryInput = {
    name: parsed.data.name,
    slug: emptyToUndefined(parsed.data.slug),
    description: emptyToUndefined(parsed.data.description),
  };

  try {
    if (id === null) await createCategory(input);
    else await updateCategory(id, input);
  } catch (error: unknown) {
    return mapError(error);
  }
  revalidatePath("/admin/taxonomy");
  return { ok: true };
}

export async function deleteCategoryAction(id: number): Promise<TaxonomyResult> {
  await requireAuth();
  try {
    await deleteCategory(id);
  } catch (error: unknown) {
    return mapError(error);
  }
  revalidatePath("/admin/taxonomy");
  return { ok: true };
}

/* ---- Tags ---- */

export async function saveTagAction(id: number | null, raw: unknown): Promise<TaxonomyResult> {
  await requireAuth();
  const parsed = tagSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const input: TagInput = {
    name: parsed.data.name,
    slug: emptyToUndefined(parsed.data.slug),
  };

  try {
    if (id === null) await createTag(input);
    else await updateTag(id, input);
  } catch (error: unknown) {
    return mapError(error);
  }
  revalidatePath("/admin/taxonomy");
  return { ok: true };
}

export async function deleteTagAction(id: number): Promise<TaxonomyResult> {
  await requireAuth();
  try {
    await deleteTag(id);
  } catch (error: unknown) {
    return mapError(error);
  }
  revalidatePath("/admin/taxonomy");
  return { ok: true };
}
