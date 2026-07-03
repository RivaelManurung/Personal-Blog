import { describe, expect, it } from "vitest";
import { formatDate, isoDate } from "@/lib/format/date";

describe("formatDate", () => {
  it("renders MMM d, yyyy for a known ISO date", () => {
    expect(formatDate("2024-10-16T00:00:00.000Z")).toBe("Oct 16, 2024");
  });

  it("renders a date-only ISO string", () => {
    expect(formatDate("2024-01-05")).toBe("Jan 5, 2024");
  });

  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("returns empty string for garbage input", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("isoDate", () => {
  it("returns empty string for null", () => {
    expect(isoDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(isoDate(undefined)).toBe("");
  });

  it("returns empty string for garbage input", () => {
    expect(isoDate("not-a-date")).toBe("");
  });

  it("returns an ISO string for a valid date", () => {
    expect(isoDate("2024-10-16T00:00:00.000Z")).toBe(
      "2024-10-16T00:00:00.000Z",
    );
  });
});
