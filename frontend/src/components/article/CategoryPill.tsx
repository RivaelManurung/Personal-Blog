import Link from "next/link";
import { cn } from "@/lib/utils";

interface CategoryPillProps {
  name: string;
  slug?: string;
  /** When true, render as a static label instead of a link. */
  asLabel?: boolean;
  className?: string;
}

/**
 * Category pill. Fill is derived from the ambient `--cat` custom property set
 * by the parent card, mixed toward transparent for a soft tinted glass look.
 */
export function CategoryPill({ name, slug, asLabel, className }: CategoryPillProps) {
  const classes = cn(
    "inline-flex items-center rounded-full px-3 py-1",
    "text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-foreground",
    "bg-[color-mix(in_oklch,var(--cat)_85%,transparent)] ring-1 ring-black/5 backdrop-blur-sm",
    className,
  );

  if (asLabel || !slug) {
    return <span className={classes}>{name}</span>;
  }

  return (
    <Link
      href={`/categories/${slug}`}
      className={cn(
        classes,
        "transition duration-300 ease-[var(--ease-out-expo)] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {name}
    </Link>
  );
}
