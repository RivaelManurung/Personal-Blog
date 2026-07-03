import { cn } from "@/lib/utils";
import type { PostStatus } from "@/types/api";

const STYLES: Record<PostStatus, { label: string; className: string }> = {
  published: {
    label: "Published",
    className: "border-transparent bg-[color-mix(in_oklch,var(--chart-3)_20%,transparent)] text-[var(--chart-3)]",
  },
  draft: {
    label: "Draft",
    className: "border-border bg-muted text-muted-foreground",
  },
  scheduled: {
    label: "Scheduled",
    className: "border-transparent bg-[color-mix(in_oklch,var(--chart-2)_20%,transparent)] text-[var(--chart-2)]",
  },
};

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  const style = STYLES[status] ?? STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {style.label}
    </span>
  );
}
