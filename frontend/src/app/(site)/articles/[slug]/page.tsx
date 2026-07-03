import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { getPost, getPosts } from "@/lib/api/posts";
import { mediaSrc } from "@/lib/media";
import { formatDate, isoDate } from "@/lib/format/date";
import { categoryTintStyle } from "@/lib/category-tint";
import { SITE } from "@/lib/config/site";
import { Container } from "@/components/site/Container";
import { Prose } from "@/components/article/Prose";
import { CategoryPill } from "@/components/article/CategoryPill";
import {
  JsonLd,
  blogPostingJsonLd,
  breadcrumbJsonLd,
} from "@/components/seo/JsonLd";

export const revalidate = 300;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

/** Best-effort SSG seed; resilient fetchers return [] when backend is down. */
export async function generateStaticParams() {
  const { items } = await getPosts({ limit: 50, sort: "published_at desc" });
  return items.map((post) => ({ slug: post.slug }));
}

// The About page is standalone at /about; keep it out of the article route.
const ABOUT_SLUG = "about";

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === ABOUT_SLUG) redirect("/about");
  const post = await getPost(slug);
  if (!post) return { title: "Article not found" };

  const canonical = post.canonicalUrl || `${SITE.url}/articles/${post.slug}`;
  const description = post.seoDescription || post.excerpt || SITE.description;
  const ogImg = mediaSrc(post.ogImage) ?? mediaSrc(post.coverImage);

  return {
    title: post.seoTitle || post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description,
      url: canonical,
      publishedTime: isoDate(post.publishedAt) || undefined,
      modifiedTime: isoDate(post.updatedAt) || undefined,
      authors: post.author?.displayName ? [post.author.displayName] : undefined,
      tags: post.tags?.map((t) => t.name),
      images: ogImg ? [{ url: ogImg }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description,
      images: ogImg ? [ogImg] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  if (slug === ABOUT_SLUG) redirect("/about");
  const post = await getPost(slug);
  if (!post) notFound();

  const cover = mediaSrc(post.coverImage);
  const publishedLabel = formatDate(post.publishedAt);

  return (
    <article style={categoryTintStyle(post.category?.slug)}>
      <JsonLd
        data={[
          blogPostingJsonLd(post),
          breadcrumbJsonLd([
            { name: "Home", url: SITE.url },
            { name: "Articles", url: `${SITE.url}/articles` },
            { name: post.title, url: `${SITE.url}/articles/${post.slug}` },
          ]),
        ]}
      />

      <Container className="py-12 sm:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {post.category && (
              <CategoryPill name={post.category.name} slug={post.category.slug} />
            )}
            {publishedLabel && (
              <time dateTime={isoDate(post.publishedAt)}>{publishedLabel}</time>
            )}
            {post.readingTimeMin > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {post.readingTimeMin} min read
              </span>
            )}
          </div>

          <h1 className="mt-6 font-display text-[length:var(--text-display)] leading-[1.05] text-foreground">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          {post.author?.displayName && (
            <p className="mt-6 text-sm text-muted-foreground">
              By <span className="text-foreground">{post.author.displayName}</span>
            </p>
          )}
        </header>
      </Container>

      {cover && (
        <Container className="pb-12">
          <div className="relative mx-auto aspect-[16/9] max-w-5xl overflow-hidden rounded-3xl ring-1 ring-border">
            <Image
              src={cover}
              alt={post.coverImage?.altText || post.title}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </Container>
      )}

      <Container className="pb-8">
        <div className="mx-auto flex justify-center">
          <Prose html={post.content} />
        </div>
      </Container>

      {post.tags?.length > 0 && (
        <Container className="pb-16">
          <div className="mx-auto max-w-[68ch] border-t border-border pt-8">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Tagged
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag.id}>
                  <Link
                    href={`/tags/${tag.slug}`}
                    className="inline-flex rounded-full bg-surface-sunken px-3 py-1.5 text-sm text-foreground ring-1 ring-border transition hover:ring-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    #{tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      )}
    </article>
  );
}
