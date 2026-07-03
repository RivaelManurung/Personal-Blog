import { describe, expect, it } from "vitest";
import { importMarkdownFile, markdownToArticle } from "@/features/posts/markdown";

describe("markdownToArticle", () => {
  it("lifts the first H1 into title and removes it from html", () => {
    const result = markdownToArticle("# My Title\n\nSome body text.");
    expect(result.title).toBe("My Title");
    expect(result.html).not.toContain("My Title");
    expect(result.html.toLowerCase()).not.toContain("<h1");
  });

  it("normalizes ## to <h2>", () => {
    const result = markdownToArticle("## Section");
    expect(result.html).toContain("<h2>");
    expect(result.html).toContain("Section");
  });

  it("normalizes ### and deeper to <h3>", () => {
    const result = markdownToArticle("### Deep\n\n#### Deeper\n\n##### Deepest");
    expect(result.html).toContain("<h3>");
    expect(result.html.toLowerCase()).not.toContain("<h4");
    expect(result.html.toLowerCase()).not.toContain("<h5");
  });

  it("flattens a non-first H1 down to <h2>", () => {
    // First H1 becomes the title; a later H1 is normalized to h2.
    const result = markdownToArticle("# Title\n\n# Another Top Heading\n\ntext");
    expect(result.title).toBe("Title");
    expect(result.html).toContain("<h2>");
    expect(result.html.toLowerCase()).not.toContain("<h1");
  });

  it("preserves lists", () => {
    const result = markdownToArticle("- one\n- two\n- three");
    expect(result.html).toContain("<ul>");
    expect(result.html).toContain("<li>");
    expect(result.html).toContain("one");
  });

  it("preserves fenced code blocks", () => {
    const result = markdownToArticle("```\nconst x = 1;\n```");
    expect(result.html).toContain("<pre>");
    expect(result.html).toContain("<code>");
    expect(result.html).toContain("const x = 1;");
  });

  it("preserves links", () => {
    const result = markdownToArticle("[example](https://example.com)");
    expect(result.html).toContain("<a");
    expect(result.html).toContain("https://example.com");
    expect(result.html).toContain("example");
  });

  it("uses the first paragraph as a trimmed excerpt", () => {
    const result = markdownToArticle("# Title\n\nFirst paragraph here.\n\nSecond paragraph.");
    expect(result.excerpt).toBe("First paragraph here.");
  });

  it("collapses whitespace in the excerpt", () => {
    const result = markdownToArticle("Lots   of\n\tspace   here.");
    expect(result.excerpt).toBe("Lots of space here.");
  });

  describe("XSS sanitization", () => {
    it("removes <script> tags", () => {
      const result = markdownToArticle("Hello\n\n<script>alert(1)</script>");
      expect(result.html.toLowerCase()).not.toContain("<script");
      expect(result.html).not.toContain("alert(1)");
    });

    it("removes onerror handler attributes on img", () => {
      const result = markdownToArticle('<img src=x onerror=alert(1)>');
      expect(result.html.toLowerCase()).not.toContain("onerror");
    });
  });

  describe("documented behavior: tables and images", () => {
    it("GFM tables render as a real <table> that survives sanitization", () => {
      const result = markdownToArticle("| a | b |\n| - | - |\n| 1 | 2 |");
      // marked (gfm) emits <table>, and DOMPurify's html profile retains it.
      expect(result.html.toLowerCase()).toContain("<table");
      expect(result.html.toLowerCase()).toContain("<td");
    });

    it("markdown images render as <img> that survives sanitization", () => {
      const result = markdownToArticle("![alt text](https://example.com/pic.png)");
      // marked emits <img>, and DOMPurify's html profile retains it.
      expect(result.html.toLowerCase()).toContain("<img");
      expect(result.html).toContain("https://example.com/pic.png");
    });
  });
});

describe("importMarkdownFile", () => {
  const makeFile = (text: string, name: string, type = "text/markdown") =>
    new File([text], name, { type });

  it("rejects a non-markdown extension (.png)", async () => {
    const file = makeFile("# hi", "image.png", "image/png");
    await expect(importMarkdownFile(file)).rejects.toThrow(/\.md/);
  });

  it("rejects a file larger than 1 MB", async () => {
    const big = "a".repeat((1 << 20) + 1);
    const file = makeFile(big, "big.md");
    await expect(importMarkdownFile(file)).rejects.toThrow(/too large/i);
  });

  it("rejects empty (whitespace-only) content", async () => {
    const file = makeFile("   \n\t ", "empty.md");
    await expect(importMarkdownFile(file)).rejects.toThrow(/empty/i);
  });

  it("accepts a valid .md file and returns the parsed article", async () => {
    const file = makeFile("# Doc Title\n\nIntro paragraph.", "doc.md");
    const article = await importMarkdownFile(file);
    expect(article.title).toBe("Doc Title");
    expect(article.excerpt).toBe("Intro paragraph.");
    expect(article.html).toContain("Intro paragraph.");
  });
});
