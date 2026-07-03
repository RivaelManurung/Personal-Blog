"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { TermDialog } from "@/features/taxonomy/components/TermDialog";
import {
  deleteCategoryAction,
  deleteTagAction,
  saveCategoryAction,
  saveTagAction,
} from "@/features/taxonomy/actions";
import type { Category, Tag } from "@/types/api";

type Term = Category | Tag;
type Kind = "category" | "tag";

interface TaxonomyManagerProps {
  categories: Category[];
  tags: Tag[];
}

export function TaxonomyManager({ categories, tags }: TaxonomyManagerProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ kind: Kind; term: Term | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: Kind; term: Term } | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { kind, term } = pendingDelete;
    startDelete(async () => {
      const result =
        kind === "category" ? await deleteCategoryAction(term.id) : await deleteTagAction(term.id);
      if (result.ok) {
        toast.success(`Deleted “${term.name}”`);
        setPendingDelete(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not delete");
      }
    });
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Taxonomy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize stories with categories and tags.
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="tags">Tags ({tags.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <TermTable
            kind="category"
            terms={categories}
            withDescription
            onCreate={() => setDialog({ kind: "category", term: null })}
            onEdit={(term) => setDialog({ kind: "category", term })}
            onDelete={(term) => setPendingDelete({ kind: "category", term })}
          />
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <TermTable
            kind="tag"
            terms={tags}
            onCreate={() => setDialog({ kind: "tag", term: null })}
            onEdit={(term) => setDialog({ kind: "tag", term })}
            onDelete={(term) => setPendingDelete({ kind: "tag", term })}
          />
        </TabsContent>
      </Tabs>

      {dialog ? (
        <TermDialog
          kind={dialog.kind}
          term={dialog.term}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
          save={dialog.kind === "category" ? saveCategoryAction : saveTagAction}
        />
      ) : null}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.term.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Posts referencing this {pendingDelete?.kind} will lose the association. This cannot be
              undone.
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
    </div>
  );
}

interface TermTableProps {
  kind: Kind;
  terms: Term[];
  withDescription?: boolean;
  onCreate: () => void;
  onEdit: (term: Term) => void;
  onDelete: (term: Term) => void;
}

function TermTable({ kind, terms, withDescription, onCreate, onEdit, onDelete }: TermTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {terms.length} {terms.length === 1 ? kind : `${kind}s`}
        </p>
        <Button size="sm" onClick={onCreate}>
          <Plus className="size-4" />
          New {kind}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            {withDescription ? <TableHead className="hidden md:table-cell">Description</TableHead> : null}
            <TableHead className="text-right">Posts</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {terms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={withDescription ? 5 : 4} className="h-24 text-center text-muted-foreground">
                No {kind}s yet.
              </TableCell>
            </TableRow>
          ) : (
            terms.map((term) => (
              <TableRow key={term.id}>
                <TableCell className="font-medium">{term.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{term.slug}</code>
                </TableCell>
                {withDescription ? (
                  <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                    {"description" in term ? (term.description ?? "—") : "—"}
                  </TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {term.postCount ?? 0}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(term)}>
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit {term.name}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(term)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete {term.name}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
