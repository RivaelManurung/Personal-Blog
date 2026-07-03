"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/site/Container";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SiteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[site] render error:", error);
  }, [error]);

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-lg rounded-3xl bg-surface-sunken p-12 text-center ring-1 ring-border">
        <p className="font-display text-[length:var(--text-title)] text-foreground">
          Something went sideways
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          We hit an unexpected error loading this page. You can try again, or head back home.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-foreground ring-1 ring-border transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go home
          </Link>
        </div>
      </div>
    </Container>
  );
}
