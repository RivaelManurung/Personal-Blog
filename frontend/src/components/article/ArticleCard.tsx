import Link from "next/link";
import Image from "next/image";
import type { PostSummary } from "@/types/api";
import { mediaSrc } from "@/lib/media";
import { categoryTintStyle } from "@/lib/category-tint";
import { cn } from "@/lib/utils";
import { CategoryPill } from "./CategoryPill";
import { DatePill } from "./DatePill";
import { IndexNumber } from "./IndexNumber";
import { CircleArrowButton } from "@/components/site/CircleArrowButton";

type Variant = "hero" | "stacked" | "feature";

interface ArticleCardProps {
  post: PostSummary;
  index?: number;
  variant?: Variant;
  /** Hint next/image to prioritize (use for the LCP hero only). */
  priority?: boolean;
  className?: string;
}

const ASPECT: Record<Variant, string> = {
  hero: "aspect-[4/5] sm:aspect-[16/12]",
  stacked: "aspect-[4/4.4]",
  feature: "aspect-[4/4.4]",
};

const TITLE_SIZE: Record<Variant, string> = {
  hero: "text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.05]",
  stacked: "text-xl sm:text-2xl leading-tight",
  feature: "text-xl sm:text-2xl leading-tight",
};

const IMAGE_SIZES: Record<Variant, string> = {
  hero: "(max-width: 1024px) 100vw, 55vw",
  stacked: "(max-width: 1024px) 100vw, 25vw",
  feature: "(max-width: 1024px) 100vw, 25vw",
};

/**
 * Photo-led article card matching the bento reference: frosted category and
 * date chips in the top corners, an editorial index number mid-left, a white
 * serif title at the bottom-left, and a cream circle-arrow button that notches
 * out of the bottom-right corner (faked with a page-background plate so the
 * cutout reads in both themes).
 */
export function ArticleCard({
  post,
  index,
  variant = "feature",
  priority = false,
  className,
}: ArticleCardProps) {
  const href = `/articles/${post.slug}`;
  const cover = mediaSrc(post.coverImage);
  const alt = post.coverImage?.altText || post.title;

  return (
    <article
      style={categoryTintStyle(post.category?.slug)}
      className={cn("group relative isolate", ASPECT[variant], className)}
    >
      {/* Clipped photo layer */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-2xl bg-surface-sunken ring-1 ring-border",
          "transition duration-500 ease-[var(--ease-out-expo)] group-hover:ring-foreground/20",
          "focus-within:ring-2 focus-within:ring-ring",
        )}
      >
        {cover ? (
          <Image
            src={cover}
            alt={alt}
            fill
            priority={priority}
            sizes={IMAGE_SIZES[variant]}
            placeholder={post.coverImage?.blurDataURL ? "blur" : "empty"}
            blurDataURL={post.coverImage?.blurDataURL || undefined}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[color-mix(in_oklch,var(--cat)_40%,var(--surface-sunken))]"
          />
        )}

        {/* tinted + dark scrim for legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/5"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/3 bg-[color-mix(in_oklch,var(--cat)_28%,transparent)] mix-blend-multiply"
        />

        {/* top row: category + date */}
        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          {post.category ? (
            <CategoryPill name={post.category.name} slug={post.category.slug} asLabel />
          ) : (
            <span />
          )}
          <DatePill iso={post.publishedAt} />
        </div>

        {/* index number, mid-left */}
        {typeof index === "number" && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <IndexNumber value={index} className="text-white/85" />
          </div>
        )}

        {/* bottom-left title (kept clear of the notched arrow) */}
        <h3
          className={cn(
            "absolute bottom-4 left-4 right-16 font-display text-white drop-shadow-sm",
            TITLE_SIZE[variant],
          )}
        >
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </h3>
      </div>

      {/* cream arrow notching out of the bottom-right corner */}
      <div className="absolute -bottom-1 -right-1 z-10 rounded-full bg-background p-1.5">
        <CircleArrowButton
          href={href}
          label={`Read: ${post.title}`}
          size={variant === "hero" ? "md" : "sm"}
          tone="accent"
        />
      </div>
    </article>
  );
}
