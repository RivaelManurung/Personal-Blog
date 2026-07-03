import Link from "next/link";
import { SITE } from "@/lib/config/site";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-[length:var(--text-hero)] leading-none text-foreground">
        404
      </p>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        This page has wandered off the map. It may have moved, or never existed at all.
      </p>
      <div className="mt-10 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to {SITE.name}
        </Link>
        <Link
          href="/articles"
          className="rounded-full px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-foreground ring-1 ring-border transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Browse articles
        </Link>
      </div>
    </div>
  );
}
