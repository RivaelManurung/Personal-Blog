/**
 * Map a category slug to the CSS custom property that carries its tint.
 * The returned string is a variable name (e.g. "--cat-life") intended to be
 * used inside `var(...)`. Cards set `--cat` to `var(categoryTintVar(slug))`
 * and derive pill fills / photo scrims via color-mix.
 */

const TINT_BY_SLUG: Record<string, string> = {
  life: "--cat-life",
  lifestyle: "--cat-life",
  culture: "--cat-culture",
  community: "--cat-culture",
  mind: "--cat-mind",
  travel: "--cat-travel",
  craft: "--cat-craft",
  finance: "--cat-craft",
};

export function categoryTintVar(slug?: string): string {
  if (!slug) return "--cat-default";
  return TINT_BY_SLUG[slug.toLowerCase()] ?? "--cat-default";
}

/** Convenience: an inline style object wiring `--cat` for a card subtree. */
export function categoryTintStyle(slug?: string): React.CSSProperties {
  return { ["--cat" as string]: `var(${categoryTintVar(slug)})` } as React.CSSProperties;
}
