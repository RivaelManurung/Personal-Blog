import { redirect } from "next/navigation";
import { getPost } from "@/lib/api/posts";
import { listPosts } from "@/lib/admin/api";

export const revalidate = 0;

export default async function AdminAboutRedirectPage() {
  const publicPost = await getPost("about");
  if (publicPost) {
    redirect(`/admin/posts/${publicPost.id}/edit`);
  }

  // Fallback to admin list if it's currently in draft status
  const { items } = await listPosts({ limit: 50 });
  const aboutPost = items.find((p) => p.slug === "about");
  if (aboutPost) {
    redirect(`/admin/posts/${aboutPost.id}/edit`);
  }

  redirect("/admin/posts/new?slug=about&title=About");
}
