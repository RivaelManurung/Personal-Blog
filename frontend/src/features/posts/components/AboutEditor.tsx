"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { postSchema, type PostFormValues } from "@/features/posts/schema";
import { updatePostAction } from "@/features/posts/actions";
import { RichTextEditor } from "@/features/posts/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { PostDetail } from "@/types/api";

/**
 * The About page is stored as a post under the reserved "about" slug so it reuses
 * the same content pipeline, but it is NOT a blog article: it is excluded from
 * every post listing and edited here, on its own page. This editor exposes only
 * what /about renders (title + body) plus the SEO description, and pins the
 * slug/status so the page can never be renamed or unpublished by accident.
 */
function toAboutDefaults(post: PostDetail): PostFormValues {
  return {
    title: post.title ?? "",
    slug: "about", // reserved — not editable here
    excerpt: post.excerpt ?? "",
    content: post.content ?? "",
    contentFormat: "html",
    categoryId: post.category?.id ?? null,
    tagIds: post.tags?.map((t) => t.id) ?? [],
    coverImageId: post.coverImage?.id ?? null,
    ogImageId: post.ogImage?.id ?? null,
    status: "published", // the About page is always live
    publishedAt: post.publishedAt ?? "",
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
    canonicalUrl: post.canonicalUrl ?? "",
  };
}

export function AboutEditor({ post }: { post: PostDetail }) {
  const [isSubmitting, startSubmit] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: toAboutDefaults(post),
  });

  const content = watch("content");
  const wordCount = useMemo(() => {
    const text = (content ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const onSubmit = handleSubmit((values) => {
    startSubmit(async () => {
      const result = await updatePostAction(post.id, values);
      if (result && !result.ok) {
        toast.error(result.error ?? result.fieldErrors?.slug ?? "Could not save the About page");
        return;
      }
      toast.success("About page saved");
    });
  });

  // ⌘/Ctrl+S saves without leaving the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void onSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSubmit]);

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-3xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">About page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shown at <span className="font-medium text-foreground">/about</span> — kept out of the Posts list.
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="about-title">Title</Label>
            <Input
              id="about-title"
              {...register("title")}
              placeholder="A journal of life's spectrum."
              aria-invalid={!!errors.title}
            />
            {errors.title ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <span className="text-xs text-muted-foreground">
                {wordCount} {wordCount === 1 ? "word" : "words"} · {readingTime} min read
              </span>
            </div>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor value={field.value ?? ""} onChange={field.onChange} />
              )}
            />
            {errors.content ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.content.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="about-seo">
              SEO description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="about-seo"
              rows={3}
              {...register("seoDescription")}
              placeholder="Meta description shown in search results for the About page."
              aria-invalid={!!errors.seoDescription}
            />
            {errors.seoDescription ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.seoDescription.message}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
