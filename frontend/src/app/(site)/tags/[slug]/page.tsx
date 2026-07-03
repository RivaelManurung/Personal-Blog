import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostsByTag } from "@/lib/api/posts";
import { getTags } from "@/lib/api/taxonomy";
import { Container } from "@/components/site/Container";
import { ArticleCard } from "@/components/article/ArticleCard";
import { Pagination } from "@/components/site/Pagination";
import { SITE } from "@/lib/config/site";

// notFound() returns a real 404 here because there is no group-level loading.tsx
// streaming the shell early. Data stays cached at the fetch layer (revalidate +
// tags in the API helpers) — do NOT add force-dynamic, which would disable it.
const PAGE_SIZE = 9;

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

function titleize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getTags();
  const name = tags.find((t) => t.slug === slug)?.name ?? titleize(slug);
  return {
    title: `#${name}`,
    description: `Articles tagged ${name} — ${SITE.name}.`,
    alternates: { canonical: `${SITE.url}/tags/${slug}` },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [{ items, meta }, tags] = await Promise.all([
    getPostsByTag(slug, { page, limit: PAGE_SIZE }),
    getTags(),
  ]);

  const matched = tags.find((t) => t.slug === slug);
  if (!matched) notFound();
  const displayName = matched.name;

  return (
    <Container className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Tag
        </p>
        <h1 className="mt-3 font-display text-[length:var(--text-display)] leading-[1.05] text-foreground">
          #{displayName}
        </h1>
      </header>

      {items.length > 0 ? (
        <>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post, i) => (
              <ArticleCard
                key={post.id}
                post={post}
                index={(page - 1) * PAGE_SIZE + i + 1}
                variant="feature"
              />
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} />
        </>
      ) : (
        <div className="mt-16 rounded-3xl bg-surface-sunken p-16 text-center ring-1 ring-border">
          <p className="font-display text-[length:var(--text-title)] text-foreground">
            No articles tagged #{displayName}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Nothing is published under this tag yet.
          </p>
        </div>
      )}
    </Container>
  );
}
