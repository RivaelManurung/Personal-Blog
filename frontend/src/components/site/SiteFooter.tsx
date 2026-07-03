import Link from "next/link";
import { Rss } from "lucide-react";
import { SITE } from "@/lib/config/site";
import { Container } from "./Container";
import { SocialIcons } from "./SocialIcons";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-surface-sunken/60">
      <Container className="py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-2xl text-foreground">{SITE.name}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{SITE.tagline}</p>
            <div className="mt-6">
              <SocialIcons />
            </div>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="grid grid-cols-2 gap-x-12 gap-y-3">
              {SITE.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="/feed.xml"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <Rss className="size-3.5" aria-hidden="true" />
                  RSS
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs uppercase tracking-[0.14em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {SITE.name}
          </p>
          <p>{SITE.description}</p>
        </div>
      </Container>
    </footer>
  );
}
