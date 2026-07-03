import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AdminApiError,
  getPost,
  listCategories,
  listTags,
} from "@/lib/admin/api";
import { PostEditor } from "@/features/posts/components/PostEditor";
import type { Category, PostDetail, Tag } from "@/types/api";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number.parseInt(id, 10);
  if (!Number.isFinite(postId) || postId <= 0) notFound();

  let post: PostDetail;
  let categories: Category[];
  let tags: Tag[];
  try {
    [post, categories, tags] = await Promise.all([
      getPost(postId),
      listCategories(),
      listTags(),
    ]);
  } catch (error: unknown) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    throw error;
  }

  return <PostEditor post={post} categories={categories} tags={tags} />;
}
