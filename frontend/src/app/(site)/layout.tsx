import { Container } from "@/components/site/Container";
import { PillNav } from "@/components/site/PillNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { JsonLd, websiteJsonLd } from "@/components/seo/JsonLd";

/**
 * Site chrome: Full width editorial layout spanning edge-to-edge across the viewport
 * with a sticky blurred header and responsive content containers.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-background text-foreground transition-colors duration-300">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <JsonLd data={websiteJsonLd()} />

      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300">
        <Container className="py-4 sm:py-5">
          <PillNav />
        </Container>
      </header>

      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
