import { describe, expect, it } from "vitest";
import { MEDIA_ORIGIN } from "@/lib/config/site";
import { mediaSrc } from "@/lib/media";
import type { Media } from "@/types/api";

function makeMedia(url: string): Media {
  return { id: 1, url, width: 100, height: 100, blurDataURL: "", altText: "" };
}

describe("mediaSrc", () => {
  it("returns null for null", () => {
    expect(mediaSrc(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(mediaSrc(undefined)).toBeNull();
  });

  it("returns null when url is empty", () => {
    expect(mediaSrc(makeMedia(""))).toBeNull();
  });

  it("prefixes a relative url with MEDIA_ORIGIN", () => {
    expect(mediaSrc(makeMedia("/uploads/x.jpg"))).toBe(
      `${MEDIA_ORIGIN}/uploads/x.jpg`,
    );
  });

  it("returns an absolute http url unchanged", () => {
    const url = "http://cdn.example.com/x.jpg";
    expect(mediaSrc(makeMedia(url))).toBe(url);
  });

  it("returns an absolute https url unchanged", () => {
    const url = "https://cdn.example.com/x.jpg";
    expect(mediaSrc(makeMedia(url))).toBe(url);
  });
});
