import type { PostDetail } from "@/types/api";
import { SITE } from "@/lib/config/site";
import { absoluteMediaSrc } from "@/lib/media";
import { isoDate } from "@/lib/format/date";

type JsonLdValue = Record<string, unknown>;

interface JsonLdProps {
  data: JsonLdValue | JsonLdValue[];
}

/**
 * Renders a JSON-LD <script>. Content is JSON-serialized (not user HTML); we
 * escape "<" to avoid closing the script tag early.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output, `<` escaped — safe.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/** WebSite schema with a SearchAction pointing at /search. */
export function websiteJsonLd(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

interface Crumb {
  name: string;
  url: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function blogPostingJsonLd(post: PostDetail): JsonLdValue {
  const url = `${SITE.url}/articles/${post.slug}`;
  const image = absoluteMediaSrc(post.ogImage) ?? absoluteMediaSrc(post.coverImage) ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: isoDate(post.publishedAt) || undefined,
    dateModified: isoDate(post.updatedAt) || isoDate(post.publishedAt) || undefined,
    image: image ? [image] : undefined,
    author: post.author?.displayName
      ? { "@type": "Person", name: post.author.displayName }
      : undefined,
    publisher: { "@type": "Organization", name: SITE.name },
    articleSection: post.category?.name || undefined,
    keywords: post.tags?.length ? post.tags.map((t) => t.name).join(", ") : undefined,
  };
}
