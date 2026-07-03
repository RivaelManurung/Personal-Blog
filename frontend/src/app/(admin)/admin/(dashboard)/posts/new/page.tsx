import type { Metadata } from "next";
import { listCategories, listTags } from "@/lib/admin/api";
import { PostEditor } from "@/features/posts/components/PostEditor";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  return <PostEditor categories={categories} tags={tags} />;
}
