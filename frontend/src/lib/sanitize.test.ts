import { describe, expect, it } from "vitest";
import { safeUrl, sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips <script> tags", () => {
    const result = sanitizeHtml("<p>ok</p><script>alert(1)</script>");
    expect(result).toContain("<p>ok</p>");
    expect(result.toLowerCase()).not.toContain("<script");
    expect(result).not.toContain("alert(1)");
  });

  it("strips inline event-handler attributes", () => {
    const result = sanitizeHtml('<p onclick="steal()">hi</p>');
    expect(result).toContain("hi");
    expect(result.toLowerCase()).not.toContain("onclick");
  });

  it("keeps safe formatting tags", () => {
    const result = sanitizeHtml("<p><strong>bold</strong></p>");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<p>");
  });

  it("keeps anchor tags", () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain("<a");
    expect(result).toContain("link");
    expect(result).toContain("https://example.com");
  });
});

describe("safeUrl", () => {
  it("returns http urls unchanged", () => {
    expect(safeUrl("http://example.com/x")).toBe("http://example.com/x");
  });

  it("returns https urls unchanged", () => {
    expect(safeUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("returns mailto urls unchanged", () => {
    expect(safeUrl("mailto:me@example.com")).toBe("mailto:me@example.com");
  });

  it("returns undefined for javascript: scheme", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(safeUrl(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(safeUrl(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(safeUrl("")).toBeUndefined();
  });
});
