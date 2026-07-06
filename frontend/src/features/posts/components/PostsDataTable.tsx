"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { toast } from "sonner";
import {
  ArrowUpDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate } from "@/lib/format/date";
import { deletePostAction } from "@/features/posts/actions";
import { ViewStatsDialog } from "@/features/views/components/ViewStatsDialog";
import type { Meta, PostAdminSummary, PostStatus } from "@/types/api";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
];

interface PostsDataTableProps {
  data: PostAdminSummary[];
  meta: Meta;
  query: string;
  status: PostStatus | "";
  sort: string;
}

export function PostsDataTable({ data, meta, query, status, sort }: PostsDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [pendingDelete, setPendingDelete] = useState<PostAdminSummary | null>(null);
  const [analyticsPost, setAnalyticsPost] = useState<PostAdminSummary | null>(null);
  const [isDeleting, startDelete] = useTransition();

  // Push URL params; server re-fetches on navigation.
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      startTransition(() => {
        router.push(`/admin/posts?${next.toString()}`);
      });
    },
    [router, searchParams],
  );

  // Debounced search -> URL.
  useEffect(() => {
    if (search === query) return;
    const id = setTimeout(() => setParams({ q: search || null, page: null }), 350);
    return () => clearTimeout(id);
  }, [search, query, setParams]);

  const toggleSort = useCallback(() => {
    const next = sort === "-updatedAt" ? "updatedAt" : "-updatedAt";
    setParams({ sort: next, page: null });
  }, [sort, setParams]);

  const columns = useMemo<ColumnDef<PostAdminSummary>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            href={`/admin/posts/${row.original.id}/edit`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.category?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "viewCount",
        header: "Views",
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {(row.original.viewCount ?? 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Open actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setAnalyticsPost(row.original);
                  }}
                >
                  <BarChart3 className="size-4" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/posts/${row.original.id}/edit`}>
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setPendingDelete(row.original);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    startDelete(async () => {
      const result = await deletePostAction(target.id);
      if (result.ok) {
        toast.success(`Deleted “${target.title}”`);
        setPendingDelete(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not delete post");
      }
    });
  };

  const busy = isPending || isDeleting;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="pl-9"
            aria-label="Search posts"
          />
        </div>
        <Select
          value={status || "all"}
          onValueChange={(value) =>
            setParams({ status: value === "all" ? null : value, page: null })
          }
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={toggleSort} className="shrink-0">
          <ArrowUpDown className="size-4" />
          {sort === "-updatedAt" ? "Newest" : "Oldest"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card" data-busy={busy}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No posts match your filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={busy ? "opacity-60" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {meta.page} of {Math.max(1, meta.totalPages)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1 || busy}
            onClick={() => setParams({ page: String(meta.page - 1) })}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= meta.totalPages || busy}
            onClick={() => setParams({ page: String(meta.page + 1) })}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewStatsDialog post={analyticsPost} onClose={() => setAnalyticsPost(null)} />
    </div>
  );
}
