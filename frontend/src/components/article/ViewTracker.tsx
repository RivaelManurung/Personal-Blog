"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordPostViewAction } from "@/features/views/actions";

interface ViewTrackerProps {
  slug: string;
  initialViews?: number;
  className?: string;
}

const VIEW_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Client component that tracks article views with a 24-hour localStorage deduplication window.
 * Also renders a clean view badge with an Eye icon.
 */
export function ViewTracker({ slug, initialViews = 0, className }: ViewTrackerProps) {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;

    const storageKey = `rv_viewed:${slug}`;
    const now = Date.now();
    let shouldRecord = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp && now - Number(parsed.timestamp) < VIEW_EXPIRATION_MS) {
          shouldRecord = false;
        }
      }
    } catch {
      // Ignore localStorage read errors (private browsing, quotas, etc.)
    }

    if (!shouldRecord) return;

    // Record view via server action
    recordPostViewAction(slug).then((res) => {
      if (res.ok) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ timestamp: now }));
        } catch {
          // Ignore localStorage write errors
        }
        if (res.stats?.total !== undefined) {
          setViews(res.stats.total);
        } else {
          setViews((prev) => prev + 1);
        }
      }
    });
  }, [slug]);

  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}>
      <Eye className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <span>
        {views.toLocaleString()} {views === 1 ? "view" : "views"}
      </span>
    </span>
  );
}
