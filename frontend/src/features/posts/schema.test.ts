import { describe, expect, it } from "vitest";
import { postSchema } from "@/features/posts/schema";

const validPost = {
  title: "My First Post",
  slug: "my-first-post",
  content: "<p>Body content</p>",
  status: "draft" as const,
};

describe("postSchema", () => {
  it("parses a valid object", () => {
    const result = postSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it("fails when title is missing", () => {
    const { title: _title, ...rest } = validPost;
    const result = postSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("fails when title is an empty string", () => {
    const result = postSchema.safeParse({ ...validPost, title: "   " });
    expect(result.success).toBe(false);
  });

  it("fails on a slug containing spaces", () => {
    const result = postSchema.safeParse({ ...validPost, slug: "my first post" });
    expect(result.success).toBe(false);
  });

  it("fails on a slug containing uppercase letters", () => {
    const result = postSchema.safeParse({ ...validPost, slug: "My-Post" });
    expect(result.success).toBe(false);
  });

  it("fails when status is scheduled without publishedAt (superRefine)", () => {
    const result = postSchema.safeParse({ ...validPost, status: "scheduled" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("publishedAt"))).toBe(true);
    }
  });

  it("passes when status is scheduled with a publishedAt", () => {
    const result = postSchema.safeParse({
      ...validPost,
      status: "scheduled",
      publishedAt: "2026-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("fails on an invalid canonicalUrl", () => {
    const result = postSchema.safeParse({ ...validPost, canonicalUrl: "not a url" });
    expect(result.success).toBe(false);
  });

  it("accepts empty-string optionals", () => {
    const result = postSchema.safeParse({
      ...validPost,
      slug: "",
      excerpt: "",
      publishedAt: "",
      seoTitle: "",
      seoDescription: "",
      canonicalUrl: "",
    });
    expect(result.success).toBe(true);
  });
});
