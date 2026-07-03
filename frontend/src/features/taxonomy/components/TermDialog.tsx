"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { slugify } from "@/features/posts/slug";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TaxonomyResult } from "@/features/taxonomy/actions";
import type { Category, Tag } from "@/types/api";

type Term = Category | Tag;
type Kind = "category" | "tag";

interface TermDialogProps {
  kind: Kind;
  term: Term | null;
  onClose: () => void;
  onSaved: () => void;
  save: (id: number | null, raw: unknown) => Promise<TaxonomyResult>;
}

export function TermDialog({ kind, term, onClose, onSaved, save }: TermDialogProps) {
  const isEdit = term !== null;
  const [name, setName] = useState(term?.name ?? "");
  const [slug, setSlug] = useState(term?.slug ?? "");
  const [description, setDescription] = useState(
    term && "description" in term ? (term.description ?? "") : "",
  );
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  const submit = () => {
    setSlugError(null);
    const raw =
      kind === "category"
        ? { name, slug, description }
        : { name, slug };
    startSave(async () => {
      const result = await save(term?.id ?? null, raw);
      if (result.ok) {
        toast.success(isEdit ? "Updated" : "Created");
        onSaved();
      } else if (result.fieldErrors?.slug) {
        setSlugError(result.fieldErrors.slug);
      } else {
        toast.error(result.error ?? "Could not save");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit" : "New"} {kind}
          </DialogTitle>
          <DialogDescription>
            {kind === "category"
              ? "Categories group stories into top-level sections."
              : "Tags label stories with fine-grained topics."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="term-name">Name</Label>
            <Input
              id="term-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "category" ? "e.g. Travel" : "e.g. minimalism"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="term-slug">Slug</Label>
            <div className="flex gap-2">
              <Input
                id="term-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={slugify(name || "auto")}
                aria-invalid={!!slugError}
                aria-describedby={slugError ? "term-slug-error" : undefined}
              />
              <Button type="button" variant="outline" onClick={() => setSlug(slugify(name))}>
                Auto
              </Button>
            </div>
            {slugError ? (
              <p id="term-slug-error" role="alert" className="text-sm text-destructive">
                {slugError}
              </p>
            ) : null}
          </div>

          {kind === "category" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="term-description">Description</Label>
              <Textarea
                id="term-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional summary of this category."
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || name.trim().length === 0}>
              {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
