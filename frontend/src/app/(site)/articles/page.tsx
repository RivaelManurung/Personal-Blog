import type { Metadata } from "next";
import { Suspense } from "react";
import { getPosts } from "@/lib/api/posts";
import { getCategories } from "@/lib/api/taxonomy";
import { Container } from "@/components/site/Container";
import { ArticleCard } from "@/components/article/ArticleCard";
import { CategoryFilter } from "@/components/site/CategoryFilter";
import { Pagination } from "@/components/site/Pagination";
import { CardGridSkeleton } from "@/components/site/Skeletons";
import { SITE } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Articles",
  description: `Every story from ${SITE.name} — ${SITE.tagline}.`,
  alternates: { canonical: `${SITE.url}/articles` },
};

const PAGE_SIZE = 9;

interface ArticlesPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  return (
    <Container className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          The Archive
        </p>
        <h1 className="mt-3 font-display text-[length:var(--text-display)] leading-[1.05] text-foreground">
          All Articles
        </h1>
      </header>

      <Suspense key={page} fallback={<CardGridSkeleton count={PAGE_SIZE} />}>
        <PostsGrid page={page} />
      </Suspense>
    </Container>
  );
}

async function PostsGrid({ page }: { page: number }) {
  const [{ items, meta }, categories] = await Promise.all([
    getPosts({ page, limit: PAGE_SIZE, sort: "published_at desc" }),
    getCategories(),
  ]);

  return (
    <>
      {categories.length > 0 && (
        <div className="mt-8">
          <CategoryFilter categories={categories} />
        </div>
      )}

      {items.length > 0 ? (
        <>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post, i) => (
              <ArticleCard
                key={post.id}
                post={post}
                index={(page - 1) * PAGE_SIZE + i + 1}
                variant="feature"
                className={`animate-fade-up ${
                  i === 0 ? "delay-75" : i === 1 ? "delay-150" : i === 2 ? "delay-200" : "delay-300"
                }`}
              />
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} />
        </>
      ) : (
        <div className="mt-16 rounded-3xl bg-surface-sunken p-16 text-center ring-1 ring-border">
          <p className="font-display text-[length:var(--text-title)] text-foreground">
            Nothing here yet
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            There are no published articles to show right now. Please check back soon.
          </p>
        </div>
      )}
    </>
  );
}
