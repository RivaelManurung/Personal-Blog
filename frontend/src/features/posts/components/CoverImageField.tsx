"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMediaAction } from "@/features/posts/actions";
import { mediaSrc } from "@/lib/media";
import type { Media } from "@/types/api";

interface CoverImageFieldProps {
  value: Media | null;
  onChange: (media: Media | null) => void;
  label?: string;
  description?: string;
}

export function CoverImageField({
  value,
  onChange,
  label = "Cover image",
  description = "Shown on cards and at the top of the article.",
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState(value?.altText ?? "");
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("altText", altText);
    startTransition(async () => {
      const result = await uploadMediaAction(formData);
      if (result.ok && result.media) {
        onChange(result.media);
        setAltText(result.media.altText || altText);
        toast.success("Image uploaded");
      } else {
        toast.error(result.error ?? "Upload failed");
      }
    });
  };

  const src = mediaSrc(value);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>{label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {src && value ? (
        <div className="group relative overflow-hidden rounded-lg border border-border">
          <Image
            src={src}
            alt={value.altText || "Cover preview"}
            width={value.width || 1200}
            height={value.height || 630}
            placeholder={value.blurDataURL ? "blur" : "empty"}
            blurDataURL={value.blurDataURL || undefined}
            className="h-48 w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => onChange(null)}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-ring hover:bg-muted/50 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <ImagePlus className="size-6" />
          )}
          <span className="text-sm">{isPending ? "Uploading…" : "Upload an image"}</span>
        </button>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="cover-alt" className="text-xs font-normal text-muted-foreground">
          Alt text
        </Label>
        <Input
          id="cover-alt"
          value={altText}
          placeholder="Describe the image for accessibility"
          onChange={(e) => setAltText(e.target.value)}
        />
      </div>
    </div>
  );
}
