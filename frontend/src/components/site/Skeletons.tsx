import { cn } from "@/lib/utils";

/**
 * Presentational loading skeletons for list/index pages. Used inside in-page
 * <Suspense> boundaries so the static page frame renders immediately while the
 * async data section streams in. Animations are zeroed under
 * prefers-reduced-motion via global CSS.
 */

/** Single article-card placeholder matching the feature card aspect ratio. */
export function ArticleCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "aspect-[16/11] animate-pulse rounded-2xl bg-surface-sunken ring-1 ring-border",
        className,
      )}
    />
  );
}

/** Responsive grid of article-card placeholders. */
export function CardGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Grid of category-tile placeholders (shorter tiles than article cards). */
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl bg-surface-sunken ring-1 ring-border"
        />
      ))}
    </div>
  );
}

/** Bento home layout placeholder mirroring the BentoGrid column structure. */
export function BentoSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
      {/* Center hero */}
      <div className="min-h-[26rem] animate-pulse rounded-3xl bg-surface-sunken ring-1 ring-border sm:min-h-[30rem] lg:col-span-6 lg:col-start-4 lg:row-start-1" />

      {/* Left stacked column */}
      <div className="flex flex-col gap-5 lg:col-span-3 lg:col-start-1 lg:row-start-1">
        <div className="aspect-[4/4.4] animate-pulse rounded-2xl bg-surface-sunken ring-1 ring-border" />
        <div className="aspect-[4/4.4] animate-pulse rounded-2xl bg-surface-sunken ring-1 ring-border" />
      </div>

      {/* Right column: intro text + feature card */}
      <div className="flex flex-col gap-5 lg:col-span-3 lg:col-start-10 lg:row-start-1">
        <div className="space-y-3 px-1 py-2">
          <div className="h-5 w-3/4 animate-pulse rounded-md bg-surface-sunken" />
          <div className="h-4 w-full animate-pulse rounded-md bg-surface-sunken" />
          <div className="h-4 w-5/6 animate-pulse rounded-md bg-surface-sunken" />
          <div className="h-10 w-36 animate-pulse rounded-full bg-surface-sunken" />
        </div>
        <div className="min-h-48 flex-1 animate-pulse rounded-2xl bg-surface-sunken ring-1 ring-border" />
      </div>
    </div>
  );
}
