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
    alternateName: ["Rivael Blog", "rivaelblog", "Rivael Manurung Blog", "Rivael's Blog"],
    description: SITE.description,
    url: SITE.url,
    keywords: SITE.keywords.join(", "),
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Person schema to establish identity and entity recognition in Google Knowledge Graph. */
export function personJsonLd(): JsonLdValue {
  const sameAs = [SITE.social.twitter, SITE.social.instagram, SITE.social.github].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.name,
    alternateName: ["rivaelblog", "Rivael Blog", "Rivael Manurung"],
    url: SITE.url,
    jobTitle: "Software Engineer & Writer",
    description: SITE.description,
    sameAs: sameAs.length ? sameAs : undefined,
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
      ? { "@type": "Person", name: post.author.displayName, url: SITE.url }
      : { "@type": "Person", name: SITE.name, url: SITE.url },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      alternateName: ["Rivael Blog", "rivaelblog"],
      url: SITE.url,
    },
    articleSection: post.category?.name || undefined,
    keywords: post.tags?.length ? post.tags.map((t) => t.name).join(", ") : SITE.keywords.slice(0, 5).join(", "),
  };
}
