import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { searchPosts } from "@/lib/api/search";

interface SearchResultsProps {
  q: string;
  page?: number;
}

/**
 * Server component: fetches and renders search hits. `snippet` may contain
 * backend-provided <mark> highlights, so it is rendered as text (not HTML)
 * to stay safe — we show the plain excerpt instead.
 */
export async function SearchResults({ q, page = 1 }: SearchResultsProps) {
  const query = q.trim();

  if (!query) {
    return (
      <p className="mt-10 text-sm text-muted-foreground">
        Type above to search across every article.
      </p>
    );
  }

  const { items, meta } = await searchPosts(query, { page, limit: 20 });

  if (items.length === 0) {
    return (
      <div className="mt-12 rounded-2xl bg-surface-sunken p-10 text-center ring-1 ring-border">
        <p className="font-display text-2xl text-foreground">No results</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing matched &ldquo;{query}&rdquo;. Try a different phrase.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {meta.total} result{meta.total === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
      </p>
      <ul className="mt-6 divide-y divide-border">
        {items.map((hit) => (
          <li key={hit.id} className="group">
            <Link
              href={`/articles/${hit.slug}`}
              className="flex items-start justify-between gap-4 py-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
            >
              <div className="min-w-0">
                <h2 className="font-display text-2xl leading-tight text-foreground">
                  {hit.title}
                </h2>
                {hit.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {hit.excerpt}
                  </p>
                )}
              </div>
              <ArrowUpRight
                className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
