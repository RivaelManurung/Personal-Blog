"use client";

import { useEffect, useState } from "react";
import { BarChart3, Calendar, Eye, Loader2, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPostViewsAction } from "@/features/views/actions";
import { formatDate } from "@/lib/format/date";
import type { PostAdminSummary, PostViewStats } from "@/types/api";

interface ViewStatsDialogProps {
  post: PostAdminSummary | null;
  onClose: () => void;
}

export function ViewStatsDialog({ post, onClose }: ViewStatsDialogProps) {
  const [stats, setStats] = useState<PostViewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!post) return;
    setLoading(true);
    getPostViewsAction(post.slug).then((res) => {
      setStats(res);
      setLoading(false);
    });
  }, [post]);

  if (!post) return null;

  const maxDaily = stats?.daily?.reduce((max, d) => Math.max(max, d.views), 0) ?? 0;
  const maxMonthly = stats?.monthly?.reduce((max, m) => Math.max(max, m.views), 0) ?? 0;

  return (
    <Dialog open={post !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="size-4" />
            <span>Article Analytics</span>
          </div>
          <DialogTitle className="font-serif text-2xl tracking-tight line-clamp-1">
            {post.title}
          </DialogTitle>
          <DialogDescription>
            Detailed view traffic breakdown over time.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Loading analytics…</p>
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Could not load traffic statistics.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-2">
            {/* Overview KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-4 ring-1 ring-border">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5 text-primary" /> Total Views
                </span>
                <span className="font-serif text-3xl font-medium tabular-nums">
                  {stats.total.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-4 ring-1 ring-border">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[var(--chart-2)]" /> 30-Day Peak
                </span>
                <span className="font-serif text-3xl font-medium tabular-nums">
                  {maxDaily.toLocaleString()}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1 rounded-xl bg-muted/40 p-4 ring-1 ring-border">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="size-3.5 text-[var(--chart-3)]" /> Monthly Peak
                </span>
                <span className="font-serif text-3xl font-medium tabular-nums">
                  {maxMonthly.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Charts Tabs */}
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="daily">Daily Traffic (Last 30 Days)</TabsTrigger>
                <TabsTrigger value="monthly">Monthly Trend (Last 12 Mo)</TabsTrigger>
              </TabsList>

              {/* Daily Tab */}
              <TabsContent value="daily" className="mt-4 flex flex-col gap-4">
                {stats.daily.length === 0 ? (
                  <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    No daily views recorded yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl bg-muted/20 p-4 ring-1 ring-border">
                    <div className="flex h-44 items-end gap-1 pt-6 px-1">
                      {stats.daily.map((d) => {
                        const heightPct = maxDaily > 0 ? Math.max(6, Math.round((d.views / maxDaily) * 100)) : 6;
                        return (
                          <div
                            key={d.date}
                            className="group relative flex flex-1 flex-col items-center justify-end h-full"
                          >
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute -top-8 z-10 hidden w-max flex-col items-center rounded bg-foreground px-2 py-1 text-[10px] text-background shadow group-hover:flex">
                              <span className="font-semibold">{d.views} views</span>
                              <span className="opacity-75">{formatDate(d.date)}</span>
                            </div>
                            {/* Bar */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full min-w-[4px] rounded-t bg-primary/70 transition-all duration-300 group-hover:bg-primary group-hover:shadow-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>{formatDate(stats.daily[0]?.date)}</span>
                      <span>{formatDate(stats.daily[stats.daily.length - 1]?.date)}</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Monthly Tab */}
              <TabsContent value="monthly" className="mt-4 flex flex-col gap-4">
                {stats.monthly.length === 0 ? (
                  <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    No monthly views recorded yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl bg-muted/20 p-4 ring-1 ring-border">
                    <div className="flex h-44 items-end gap-3 pt-6 px-2">
                      {stats.monthly.map((m) => {
                        const heightPct = maxMonthly > 0 ? Math.max(8, Math.round((m.views / maxMonthly) * 100)) : 8;
                        return (
                          <div
                            key={m.month}
                            className="group relative flex flex-1 flex-col items-center justify-end h-full"
                          >
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute -top-8 z-10 hidden w-max flex-col items-center rounded bg-foreground px-2 py-1 text-[10px] text-background shadow group-hover:flex">
                              <span className="font-semibold">{m.views} views</span>
                              <span className="opacity-75">{m.month}</span>
                            </div>
                            {/* Bar */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full max-w-[36px] rounded-t bg-[var(--chart-2)]/70 transition-all duration-300 group-hover:bg-[var(--chart-2)] group-hover:shadow-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>{stats.monthly[0]?.month}</span>
                      <span>{stats.monthly[stats.monthly.length - 1]?.month}</span>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
