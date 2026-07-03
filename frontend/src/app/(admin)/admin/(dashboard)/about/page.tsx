import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost as getPublicPost } from "@/lib/api/posts";
import { getPost as getAdminPost } from "@/lib/admin/api";
import { AboutEditor } from "@/features/posts/components/AboutEditor";

export const metadata: Metadata = { title: "About page" };
export const revalidate = 0;

/**
 * Dedicated editor for the standalone About page. The About content is stored
 * under the reserved "about" slug (seeded and always published), so we resolve
 * its id via the public by-slug endpoint, then load the full admin detail to
 * edit. It is intentionally NOT reachable through the Posts list.
 */
export default async function AdminAboutPage() {
  const published = await getPublicPost("about");
  if (!published) notFound();

  const post = await getAdminPost(published.id);
  return <AboutEditor post={post} />;
}
