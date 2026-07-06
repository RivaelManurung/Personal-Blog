/**
 * API types — the single source of truth mirroring the Go backend DTOs
 * (backend/internal/dto). Keep in sync with that package.
 */

export type PostStatus = "draft" | "scheduled" | "published";

export interface Media {
  id: number;
  url: string;
  width: number;
  height: number;
  blurDataURL: string;
  altText: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  postCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  postCount?: number;
}

export interface Author {
  displayName: string;
}

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: Media | null;
  category: Category | null;
  tags: Tag[];
  readingTimeMin: number;
  publishedAt: string | null;
  index?: number;
  viewCount?: number;
}

export interface PostDetail extends PostSummary {
  content: string;
  contentFormat: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: Media | null;
  author: Author;
  status: PostStatus;
  updatedAt: string;
}

export interface PostAdminSummary {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  category: Category | null;
  publishedAt: string | null;
  updatedAt: string;
  viewCount?: number;
}

export interface SearchHit {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  snippet: string;
  rank: number;
}

export interface Stats {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  totalViews?: number;
}

export interface DailyView {
  date: string;
  views: number;
}

export interface MonthlyView {
  month: string;
  views: number;
}

export interface PostViewStats {
  postId: number;
  total: number;
  daily: DailyView[];
  monthly: MonthlyView[];
}


export interface Admin {
  id: number;
  email: string;
  displayName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  admin: Admin;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/** Response envelope + pagination meta. */
export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: string;
  meta?: Meta;
}

export interface Paginated<T> {
  items: T[];
  meta: Meta;
}

/** Post create/update payload. */
export interface PostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  contentFormat?: "html" | "markdown";
  categoryId?: number | null;
  tagIds?: number[];
  coverImageId?: number | null;
  ogImageId?: number | null;
  status?: PostStatus;
  publishedAt?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
}
