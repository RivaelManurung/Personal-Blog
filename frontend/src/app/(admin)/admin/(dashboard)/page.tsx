import Link from "next/link";
import type { Metadata } from "next";
import { FileText, CheckCircle2, PenLine, CalendarClock, Plus, ArrowUpRight } from "lucide-react";
import { getStats, listPosts } from "@/lib/admin/api";
import { formatDate } from "@/lib/format/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Stats } from "@/types/api";

export const metadata: Metadata = { title: "Dashboard" };

const STAT_CARDS: {
  key: keyof Stats;
  label: string;
  icon: typeof FileText;
  accent: string;
}[] = [
  { key: "total", label: "Total posts", icon: FileText, accent: "text-foreground" },
  { key: "published", label: "Published", icon: CheckCircle2, accent: "text-[var(--chart-3)]" },
  { key: "drafts", label: "Drafts", icon: PenLine, accent: "text-[var(--chart-1)]" },
  { key: "scheduled", label: "Scheduled", icon: CalendarClock, accent: "text-[var(--chart-2)]" },
];

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([
    getStats(),
    listPosts({ limit: 6, sort: "-updatedAt" }),
  ]);

  return (
    <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A pulse on your library — what is live, drafted, and queued.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">
            <Plus className="size-4" />
            New post
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <Card key={card.key} className="relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className="grid size-8 place-items-center rounded-lg bg-muted/60">
                <card.icon className={`size-4 ${card.accent}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-4xl tabular-nums tracking-tight">{stats[card.key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="transition-all duration-300 hover:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recently updated</CardTitle>
          <Link
            href="/admin/posts"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            All posts
            <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="px-0">
          {recent.items.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No posts yet. Start with your first story.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.items.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{post.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {post.category?.name ?? "Uncategorized"} · updated{" "}
                        {formatDate(post.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={post.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
