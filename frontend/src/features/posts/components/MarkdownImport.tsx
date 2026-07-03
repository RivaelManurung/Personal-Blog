"use client";

import { useRef, useState } from "react";
import { FileUp, ClipboardPaste, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  importMarkdownFile,
  markdownToArticle,
  type ImportedArticle,
} from "@/features/posts/markdown";

interface MarkdownImportProps {
  onImport: (article: ImportedArticle, source: string) => void;
}

/**
 * Upload a README / Markdown file (or paste Markdown) to seed the article body.
 * The result is loaded into the editor and remains fully editable.
 */
export function MarkdownImport({ onImport }: MarkdownImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const article = await importMarkdownFile(file);
      onImport(article, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handlePaste = () => {
    setError(null);
    if (!pasteValue.trim()) {
      setError("Paste some Markdown first");
      return;
    }
    onImport(markdownToArticle(pasteValue), "pasted.md");
    setPasteValue("");
    setPasteOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a README or Markdown file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-ring bg-accent/40" : "border-border bg-muted/30 hover:border-ring",
        )}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <FileUp className="size-5 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">Import a README or Markdown file</p>
        <p className="text-xs text-muted-foreground">
          Drag &amp; drop or click to upload a <code>.md</code> — it becomes an editable draft.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          onClick={() => setPasteOpen((v) => !v)}
        >
          {pasteOpen ? <X className="size-3.5" /> : <ClipboardPaste className="size-3.5" />}
          {pasteOpen ? "Close paste" : "Or paste Markdown"}
        </Button>
      </div>

      {pasteOpen ? (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={6}
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder={"# My article\n\nPaste your Markdown here…"}
            className="font-mono text-xs"
          />
          <div>
            <Button type="button" size="sm" onClick={handlePaste}>
              Import Markdown
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
