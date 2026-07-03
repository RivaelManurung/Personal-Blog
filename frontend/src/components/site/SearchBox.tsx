"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
  className?: string;
}

/**
 * Debounced search input. Pushes `?q=` onto /search as the user types so the
 * results (a server component) revalidate. Also supports explicit submit.
 */
export function SearchBox({ className }: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams?.get("q") ?? "";

  const [value, setValue] = useState(initial);
  const debounced = useDebounce(value, 350);
  const lastPushed = useRef(initial);

  useEffect(() => {
    const q = debounced.trim();
    if (q === lastPushed.current) return;
    lastPushed.current = q;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.replace(q ? `/search?${params.toString()}` : "/search");
  }, [debounced, router]);

  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className={cn(
        "flex items-center gap-3 rounded-full bg-surface-raised px-5 py-3 ring-1 ring-border",
        "focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search articles…"
        aria-label="Search articles"
        autoComplete="off"
        className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </form>
  );
}
