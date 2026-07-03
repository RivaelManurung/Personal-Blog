import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CircleArrowButtonProps {
  href: string;
  label: string;
  /** Visual size in rem-ish tailwind sizes. */
  size?: "sm" | "md";
  /** "accent" = cream fill for the notched card corner; "default" = glassy. */
  tone?: "default" | "accent";
  className?: string;
}

/**
 * Circular "view" button with a diagonal arrow. Icon-only, so it carries an
 * accessible label. Motion stays on transform/opacity only.
 */
export function CircleArrowButton({
  href,
  label,
  size = "md",
  tone = "default",
  className,
}: CircleArrowButtonProps) {
  const dims = size === "sm" ? "size-10" : "size-12";
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group/arrow inline-flex items-center justify-center rounded-full",
        tone === "accent"
          ? "bg-accent text-accent-foreground shadow-sm"
          : "bg-background/90 text-foreground shadow-sm ring-1 ring-border backdrop-blur",
        "transition duration-300 ease-[var(--ease-out-expo)]",
        "hover:bg-foreground hover:text-background hover:scale-105 group-hover:bg-foreground group-hover:text-background group-hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        dims,
        className,
      )}
    >
      <ArrowUpRight
        className="size-5 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/arrow:-translate-y-0.5 group-hover/arrow:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
