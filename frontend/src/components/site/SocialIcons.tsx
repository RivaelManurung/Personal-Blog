import { safeUrl } from "@/lib/sanitize";
import { SITE } from "@/lib/config/site";
import { cn } from "@/lib/utils";

/**
 * Social links as circular icon buttons. This lucide-react build ships no brand
 * marks, so we render vetted inline brand SVGs (accurate + on-brand) instead.
 */

type Platform = "twitter" | "instagram" | "github";

const PATHS: Record<Platform, { label: string; path: string }> = {
  twitter: {
    label: "Twitter",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  instagram: {
    label: "Instagram",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 3.351a6.135 6.135 0 100 12.27 6.135 6.135 0 000-12.27zm0 10.122a3.988 3.988 0 110-7.975 3.988 3.988 0 010 7.975zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  github: {
    label: "GitHub",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
};

const ORDER: Platform[] = ["twitter", "instagram", "github"];

export function SocialIcons({ className }: { className?: string }) {
  const links = ORDER.map((p) => ({ platform: p, href: safeUrl(SITE.social[p]) })).filter(
    (l): l is { platform: Platform; href: string } => Boolean(l.href),
  );

  if (links.length === 0) return null;

  return (
    <ul className={cn("flex items-center gap-2.5", className)}>
      {links.map(({ platform, href }) => {
        const { label, path } = PATHS[platform];
        return (
          <li key={platform}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (opens in a new tab)`}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full",
                "bg-surface-raised text-foreground ring-1 ring-border",
                "transition duration-300 ease-[var(--ease-out-expo)]",
                "hover:bg-foreground hover:text-background hover:scale-105",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-[18px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d={path} />
              </svg>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
