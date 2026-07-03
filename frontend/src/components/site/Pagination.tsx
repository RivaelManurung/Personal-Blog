"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
}

/** Query-preserving pagination. Builds hrefs off the current pathname + params. */
export function Pagination({ page, totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (target: number): string => {
    const params = new URLSearchParams(searchParams?.toString());
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const qsStr = params.toString();
    return qsStr ? `${pathname}?${qsStr}` : pathname;
  };

  const clamped = Math.min(Math.max(1, page), totalPages);
  const pages = pageWindow(clamped, totalPages);
  const prevDisabled = clamped <= 1;
  const nextDisabled = clamped >= totalPages;

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
      <PageEdge href={hrefFor(clamped - 1)} disabled={prevDisabled} label="Previous page">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </PageEdge>

      <ul className="flex items-center gap-1.5">
        {pages.map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-current={p === clamped ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full text-sm transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  p === clamped
                    ? "bg-foreground text-background"
                    : "text-muted-foreground ring-1 ring-border hover:text-foreground hover:ring-foreground/30",
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>

      <PageEdge href={hrefFor(clamped + 1)} disabled={nextDisabled} label="Next page">
        <ChevronRight className="size-4" aria-hidden="true" />
      </PageEdge>
    </nav>
  );
}

function PageEdge({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex size-10 items-center justify-center rounded-full ring-1 ring-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-muted-foreground/40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(base, "text-foreground hover:ring-foreground/30")}>
      {children}
    </Link>
  );
}

/** Compact page window with ellipses, always showing first/last. */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
