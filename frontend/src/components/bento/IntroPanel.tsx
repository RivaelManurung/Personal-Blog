import { SITE } from "@/lib/config/site";
import { SocialIcons } from "@/components/site/SocialIcons";

/**
 * Right-column intro per the reference: plain text on the canvas (no card
 * background) — a short welcome and circular socials.
 */
export function IntroPanel() {
  return (
    <section aria-labelledby="intro-heading" className="animate-fade-up flex flex-col gap-6 px-1 py-2 sm:px-2">
      <div>
        <h2
          id="intro-heading"
          className="font-display text-lg leading-snug text-foreground sm:text-xl"
        >
          Welcome to {SITE.name}.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{SITE.description}</p>
      </div>

      <div className="flex flex-col items-start gap-5">
        <SocialIcons />
      </div>
    </section>
  );
}
