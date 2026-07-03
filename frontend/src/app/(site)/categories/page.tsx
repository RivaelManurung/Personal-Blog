import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCategories } from "@/lib/api/taxonomy";
import { categoryTintStyle } from "@/lib/category-tint";
import { Container } from "@/components/site/Container";
import { CircleArrowButton } from "@/components/site/CircleArrowButton";
import { CategoryGridSkeleton } from "@/components/site/Skeletons";
import { SITE } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Categories",
  description: `Browse ${SITE.name} by theme.`,
  alternates: { canonical: `${SITE.url}/categories` },
};

export default async function CategoriesPage() {
  return (
    <Container className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Explore
        </p>
        <h1 className="mt-3 font-display text-[length:var(--text-display)] leading-[1.05] text-foreground">
          Categories
        </h1>
      </header>

      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid />
      </Suspense>
    </Container>
  );
}

async function CategoryGrid() {
  const categories = await getCategories();

  return (
    <>
      {categories.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={categoryTintStyle(cat.slug)}
              className="group relative overflow-hidden rounded-2xl bg-surface-raised p-7 ring-1 ring-border transition duration-500 ease-[var(--ease-out-expo)] hover:ring-foreground/20"
            >
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 size-32 rounded-full bg-[color-mix(in_oklch,var(--cat)_60%,transparent)] blur-xl transition-transform duration-700 group-hover:scale-125"
              />
              <div className="relative flex h-full flex-col justify-between gap-10">
                <div>
                  <h2 className="font-display text-2xl text-foreground">
                    <Link href={`/categories/${cat.slug}`} className="after:absolute after:inset-0">
                      {cat.name}
                    </Link>
                  </h2>
                  {cat.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {cat.postCount ?? 0} article{(cat.postCount ?? 0) === 1 ? "" : "s"}
                  </span>
                  <CircleArrowButton
                    href={`/categories/${cat.slug}`}
                    label={`View ${cat.name}`}
                    size="sm"
                    className="relative z-10"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-3xl bg-surface-sunken p-16 text-center ring-1 ring-border">
          <p className="font-display text-[length:var(--text-title)] text-foreground">
            No categories yet
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Themes will appear here once articles are published.
          </p>
        </div>
      )}
    </>
  );
}
