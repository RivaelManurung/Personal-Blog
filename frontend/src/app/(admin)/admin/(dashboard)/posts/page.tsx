import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { listPosts, type ListPostsParams } from "@/lib/admin/api";
import { Button } from "@/components/ui/button";
import { PostsDataTable } from "@/features/posts/components/PostsDataTable";
import type { PostStatus } from "@/types/api";

export const metadata: Metadata = { title: "Posts" };

const PAGE_SIZE = 10;
const VALID_STATUS: PostStatus[] = ["draft", "scheduled", "published"];

interface SearchParams {
  q?: string;
  status?: string;
  page?: string;
  sort?: string;
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const status = VALID_STATUS.includes(sp.status as PostStatus)
    ? (sp.status as PostStatus)
    : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q?.trim() ?? "";
  const sort = sp.sort ?? "-updatedAt";

  const params: ListPostsParams = { q, status, page, limit: PAGE_SIZE, sort };
  const { items, meta } = await listPosts(params);

  return (
    <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta.total} {meta.total === 1 ? "story" : "stories"} in your library.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">
            <Plus className="size-4" />
            New post
          </Link>
        </Button>
      </div>

      <PostsDataTable
        data={items}
        meta={meta}
        query={q}
        status={status}
        sort={sort}
      />
    </div>
  );
}
