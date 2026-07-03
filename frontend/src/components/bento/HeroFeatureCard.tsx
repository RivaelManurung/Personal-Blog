import Link from "next/link";
import Image from "next/image";
import type { PostSummary } from "@/types/api";
import { mediaSrc } from "@/lib/media";
import { categoryTintStyle } from "@/lib/category-tint";
import { cn } from "@/lib/utils";
import { CategoryPill } from "@/components/article/CategoryPill";
import { DatePill } from "@/components/article/DatePill";

interface HeroFeatureCardProps {
  post: PostSummary;
  className?: string;
}

/** Split a title into (up to) two roughly even lines for the plate headline. */
function splitTitle(title: string): string[] {
  const words = title.trim().split(/\s+/);
  if (words.length < 4) return [title];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/**
 * The bento centerpiece: a large rounded photo card whose headline renders as
 * dark serif text on white "plates" overlapping the photo's bottom-left edge,
 * per the AshGray reference. The whole card links to the article.
 */
export function HeroFeatureCard({ post, className }: HeroFeatureCardProps) {
  const href = `/articles/${post.slug}`;
  const cover = mediaSrc(post.coverImage);
  const alt = post.coverImage?.altText || post.title;
  const lines = splitTitle(post.title);

  return (
    <article
      style={categoryTintStyle(post.category?.slug)}
      className={cn("group relative isolate h-full min-h-[26rem] sm:min-h-[30rem]", className)}
    >
      {/* Clipped photo layer */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-3xl bg-surface-sunken ring-1 ring-border",
          "transition duration-500 ease-[var(--ease-out-expo)] group-hover:ring-foreground/20",
          "focus-within:ring-2 focus-within:ring-ring",
        )}
      >
        {cover ? (
          <Image
            src={cover}
            alt={alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            placeholder={post.coverImage?.blurDataURL ? "blur" : "empty"}
            blurDataURL={post.coverImage?.blurDataURL || undefined}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[color-mix(in_oklch,var(--cat)_40%,var(--surface-sunken))]"
          />
        )}

        {/* soft scrim so the top chips stay legible */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10"
        />

        {/* top row: category + date */}
        <div className="absolute inset-x-5 top-5 flex items-start justify-between gap-2">
          {post.category ? (
            <CategoryPill name={post.category.name} slug={post.category.slug} asLabel />
          ) : (
            <span />
          )}
          <DatePill iso={post.publishedAt} />
        </div>
      </div>

      {/* white-plate headline overlapping the bottom-left edge */}
      <h2
        className={cn(
          "absolute -bottom-1 -left-1 z-10 max-w-[92%]",
          "font-display text-2xl leading-snug sm:text-3xl lg:text-4xl",
        )}
      >
        <Link href={href} className="block after:absolute after:inset-0 focus-visible:outline-none">
          {lines.map((line, i) => (
            <span
              key={i}
              className={cn(
                "block w-fit rounded-xl bg-background px-4 py-1 text-foreground",
                "transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5",
                i > 0 && "mt-1",
              )}
            >
              {line}
            </span>
          ))}
        </Link>
      </h2>
    </article>
  );
}
