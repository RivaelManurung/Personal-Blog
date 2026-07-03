import { formatDate, isoDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

interface DatePillProps {
  iso: string | null | undefined;
  className?: string;
}

/** Small glassy date chip for card corners. Renders nothing without a date. */
export function DatePill({ iso, className }: DatePillProps) {
  const label = formatDate(iso);
  if (!label) return null;

  return (
    <time
      dateTime={isoDate(iso)}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1",
        "text-[0.6875rem] font-medium uppercase tracking-[0.12em]",
        "bg-background/85 text-foreground ring-1 ring-black/5 backdrop-blur-sm",
        className,
      )}
    >
      {label}
    </time>
  );
}
