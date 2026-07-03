"use client";

import { useCallback, useImperativeHandle, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Link2Off,
  ImageIcon,
  Loader2,
  Undo2,
  Redo2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { uploadMediaAction } from "@/features/posts/actions";
import { mediaSrc } from "@/lib/media";

/** Imperative handle so a parent can push external content into the editor. */
export interface RichTextEditorHandle {
  setContent: (html: string) => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ref?: React.Ref<RichTextEditorHandle>;
}

interface ToolButton {
  icon: typeof Bold;
  label: string;
  isActive?: (e: Editor) => boolean;
  run: (e: Editor) => void;
}

export function RichTextEditor({ value, onChange, placeholder, ref }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // guard SSR hydration mismatch
    extensions: [
      // StarterKit v3 bundles Link; disable it here so the explicit
      // @tiptap/extension-link below is the single source (no duplicate names).
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image.configure({ inline: false, HTMLAttributes: { class: "rounded-lg" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your story…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useImperativeHandle(
    ref,
    () => ({
      setContent: (html: string) => {
        if (!editor) return;
        editor.commands.setContent(html || "", { emitUpdate: true });
      },
    }),
    [editor],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadMediaAction(formData);
        if (!result.ok || !result.media) {
          toast.error(result.error ?? "Image upload failed");
          return;
        }
        const src = mediaSrc(result.media);
        if (!src) {
          toast.error("Uploaded image has no URL");
          return;
        }
        editor.chain().focus().setImage({ src, alt: result.media.altText }).run();
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Image upload failed");
      } finally {
        setIsUploadingImage(false);
      }
    },
    [editor],
  );

  if (!editor) {
    return (
      <div className="min-h-[380px] rounded-lg border border-input bg-background" aria-busy />
    );
  }

  const groups: ToolButton[][] = [
    [
      { icon: Bold, label: "Bold", isActive: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
      { icon: Italic, label: "Italic", isActive: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
      { icon: Strikethrough, label: "Strikethrough", isActive: (e) => e.isActive("strike"), run: (e) => e.chain().focus().toggleStrike().run() },
    ],
    [
      { icon: Heading2, label: "Heading 2", isActive: (e) => e.isActive("heading", { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
      { icon: Heading3, label: "Heading 3", isActive: (e) => e.isActive("heading", { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    ],
    [
      { icon: List, label: "Bullet list", isActive: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
      { icon: ListOrdered, label: "Ordered list", isActive: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
      { icon: Quote, label: "Quote", isActive: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
      { icon: Code, label: "Code block", isActive: (e) => e.isActive("codeBlock"), run: (e) => e.chain().focus().toggleCodeBlock().run() },
    ],
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1.5">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {group.map((btn) => {
              const active = btn.isActive?.(editor) ?? false;
              return (
                <ToolbarButton key={btn.label} label={btn.label} active={active} onClick={() => btn.run(editor)}>
                  <btn.icon className="size-4" />
                </ToolbarButton>
              );
            })}
            <Separator orientation="vertical" className="mx-1 h-5" />
          </div>
        ))}
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Remove link"
          active={false}
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Link2Off className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Insert image"
          active={false}
          disabled={isUploadingImage}
          onClick={() => imageInputRef.current?.click()}
        >
          {isUploadingImage ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageFile(file);
            e.target.value = "";
          }}
        />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          label="Undo"
          active={false}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          active={false}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "bg-background text-foreground shadow-sm",
      )}
    >
      {children}
    </button>
  );
}
