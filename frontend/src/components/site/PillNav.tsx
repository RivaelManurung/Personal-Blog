"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, MoveUpRight, X } from "lucide-react";
import { SITE } from "@/lib/config/site";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/site/ThemeToggle";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Three-zone header: brand mark + name on the left, a cream pill nav in the
 * center (active item rendered as a white chip), and a dark "Join Now" CTA
 * plus the theme toggle on the right.
 */
export function PillNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center justify-between gap-4">
      {/* Brand: logo mark + name */}
      <Link
        href="/"
        className="group flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-xl bg-foreground text-background transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-105"
        >
          <MoveUpRight className="size-4" strokeWidth={2.5} />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight text-foreground">
          {SITE.name}
        </span>
      </Link>

      {/* Desktop pill nav — centered between the two side zones */}
      <nav
        aria-label="Main navigation"
        className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block"
      >
        <ul className="flex items-center gap-1 rounded-full bg-surface-sunken p-1.5 ring-1 ring-border/60">
          {SITE.nav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex rounded-full px-4 py-2 text-sm transition duration-300 ease-[var(--ease-out-expo)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Right zone: theme toggle + mobile menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface-raised ring-1 ring-border md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-[3.25rem] z-50 rounded-3xl bg-surface-raised p-3 shadow-lg ring-1 ring-border md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {SITE.nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-sm transition",
                      active
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-foreground hover:bg-surface-sunken",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
