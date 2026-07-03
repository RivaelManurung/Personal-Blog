/** Public, non-secret site configuration. */
export const SITE = {
  name: "Rivael Manurung",
  tagline: "Journeys through life's spectrum",
  description:
    "A personal editorial blog — reflections, inspiration, and discovery across life's spectrum.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { label: "Home", href: "/" },
    { label: "Articles", href: "/articles" },
    { label: "Categories", href: "/categories" },
    { label: "About", href: "/about" },
  ],
  social: {
    twitter: "https://twitter.com",
    instagram: "https://instagram.com",
    github: "https://github.com",
  },
} as const;

/** Server-only base URL for the Go API (never exposed to the client bundle). */
export const API_BASE_URL =
  (process.env.BACKEND_URL ?? "http://localhost:8080") + "/api/v1";

/** Public origin of the Go backend, used to resolve media URLs in the browser. */
export const MEDIA_ORIGIN =
  process.env.NEXT_PUBLIC_MEDIA_ORIGIN ?? "http://localhost:8080";
