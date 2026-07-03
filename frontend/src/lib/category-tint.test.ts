import { describe, expect, it } from "vitest";
import { categoryTintVar } from "@/lib/category-tint";

describe("categoryTintVar", () => {
  it.each([
    ["life", "--cat-life"],
    ["lifestyle", "--cat-life"],
    ["culture", "--cat-culture"],
    ["community", "--cat-culture"],
    ["mind", "--cat-mind"],
    ["travel", "--cat-travel"],
    ["craft", "--cat-craft"],
    ["finance", "--cat-craft"],
  ])("maps %s to %s", (slug, expected) => {
    expect(categoryTintVar(slug)).toBe(expected);
  });

  it("is case-insensitive", () => {
    expect(categoryTintVar("LIFE")).toBe("--cat-life");
  });

  it("returns default for an unknown slug", () => {
    expect(categoryTintVar("unknown")).toBe("--cat-default");
  });

  it("returns default for undefined", () => {
    expect(categoryTintVar(undefined)).toBe("--cat-default");
  });
});
