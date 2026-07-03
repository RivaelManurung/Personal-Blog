import Link from "next/link";
import type { Category } from "@/types/api";
import { categoryTintStyle } from "@/lib/category-tint";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: Category[];
  /** Slug of the active category, if any. */
  activeSlug?: string;
  /** Show an "All" pill linking to /articles. */
  showAll?: boolean;
  className?: string;
}

/** Horizontal row of tinted category pills that link to category pages. */
export function CategoryFilter({
  categories,
  activeSlug,
  showAll = true,
  className,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Filter by category" className={cn("flex flex-wrap items-center gap-2", className)}>
      {showAll && (
        <Link
          href="/articles"
          aria-current={!activeSlug ? "true" : undefined}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !activeSlug
              ? "bg-foreground text-background"
              : "text-muted-foreground ring-1 ring-border hover:text-foreground",
          )}
        >
          All
        </Link>
      )}
      {categories.map((cat) => {
        const active = cat.slug === activeSlug;
        return (
          <Link
            key={cat.id}
            href={`/categories/${cat.slug}`}
            style={categoryTintStyle(cat.slug)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-foreground text-background"
                : "bg-[color-mix(in_oklch,var(--cat)_70%,transparent)] text-foreground ring-1 ring-black/5 hover:scale-105",
            )}
          >
            {cat.name}
          </Link>
        );
      })}
    </nav>
  );
}
