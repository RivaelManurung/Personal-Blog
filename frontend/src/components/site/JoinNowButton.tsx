import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinNowButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

/** Pill CTA — ink-filled, with a trailing arrow that nudges on hover. */
export function JoinNowButton({
  href = "/about",
  label = "Join Now",
  className,
}: JoinNowButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full",
        "bg-foreground px-6 py-3 text-background",
        "text-xs font-medium uppercase tracking-[0.18em]",
        "transition duration-300 ease-[var(--ease-out-expo)]",
        "hover:opacity-90 hover:scale-[1.02]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {label}
      <ArrowRight
        className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}
