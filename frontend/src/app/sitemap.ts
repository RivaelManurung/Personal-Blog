import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/api/posts";
import { getCategories, getTags } from "@/lib/api/taxonomy";
import { SITE } from "@/lib/config/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ items: posts }, categories, tags] = await Promise.all([
    getPosts({ limit: 200, sort: "published_at desc" }),
    getCategories(),
    getTags(),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/articles`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE.url}/articles/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE.url}/categories/${cat.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${SITE.url}/tags/${tag.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...categoryRoutes, ...tagRoutes];
}
