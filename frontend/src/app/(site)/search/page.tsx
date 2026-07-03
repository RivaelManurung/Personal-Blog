import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/site/Container";
import { SearchBox } from "@/components/site/SearchBox";
import { SearchResults } from "@/components/site/SearchResults";
import { SITE } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: `Search articles on ${SITE.name}.`,
  robots: { index: false },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageParam } = await searchParams;
  const query = q ?? "";
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  return (
    <Container className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Search
        </p>
        <h1 className="mt-3 font-display text-[length:var(--text-display)] leading-[1.05] text-foreground">
          Find a story
        </h1>
      </header>

      <div className="mt-8 max-w-2xl">
        <Suspense fallback={null}>
          <SearchBox />
        </Suspense>
      </div>

      <div className="max-w-3xl">
        <Suspense key={`${query}-${page}`} fallback={<SearchPending />}>
          <SearchResults q={query} page={page} />
        </Suspense>
      </div>
    </Container>
  );
}

function SearchPending() {
  return (
    <div className="mt-10 space-y-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-sunken" />
      ))}
    </div>
  );
}
