import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

interface ProseProps {
  html: string;
  className?: string;
}

/**
 * Renders sanitized post HTML with hand-rolled editorial typography
 * (@tailwindcss/typography is not installed). Styling targets descendant
 * elements via arbitrary variants so it applies to server-injected markup.
 */
export function Prose({ html, className }: ProseProps) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-[1.0625rem] leading-[1.75] text-foreground/90",
        // headings
        "[&_h2]:font-display [&_h2]:text-[length:var(--text-title)] [&_h2]:leading-tight [&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:text-foreground",
        "[&_h3]:font-display [&_h3]:text-2xl [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-foreground",
        "[&_h4]:font-sans [&_h4]:font-semibold [&_h4]:text-lg [&_h4]:mt-8 [&_h4]:mb-2 [&_h4]:text-foreground",
        // paragraphs + inline
        "[&_p]:my-5",
        "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2 [&_a]:underline-offset-4 [&_a:hover]:decoration-foreground",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        // lists
        "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_li]:my-2 [&_li]:marker:text-muted-foreground",
        // blockquote
        "[&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-5 [&_blockquote]:font-display [&_blockquote]:text-xl [&_blockquote]:italic [&_blockquote]:text-foreground/80",
        // code
        "[&_code]:rounded [&_code]:bg-surface-sunken [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:font-mono",
        "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-surface-sunken [&_pre]:p-5 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // media + rules
        "[&_img]:my-8 [&_img]:rounded-2xl [&_img]:w-full [&_img]:h-auto",
        "[&_hr]:my-12 [&_hr]:border-border",
        "[&_figure]:my-8 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground",
        "[&_table]:my-6 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:text-left [&_td]:border-b [&_td]:border-border [&_td]:py-2",
        className,
      )}
      // Sanitized via DOMPurify at the call boundary (defense-in-depth).
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
