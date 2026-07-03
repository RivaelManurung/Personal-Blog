import { cn } from "@/lib/utils";

interface IndexNumberProps {
  value: number;
  className?: string;
}

/** Editorial 3-digit index marker, e.g. "001". */
export function IndexNumber({ value, className }: IndexNumberProps) {
  const padded = String(Math.max(0, value)).padStart(3, "0");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-display text-sm tabular-nums tracking-widest text-background/80",
        className,
      )}
    >
      {padded}
    </span>
  );
}
