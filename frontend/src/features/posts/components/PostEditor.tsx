"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Check, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/features/posts/slug";
import { postSchema, type PostFormValues } from "@/features/posts/schema";
import { createPostAction, updatePostAction } from "@/features/posts/actions";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/features/posts/components/RichTextEditor";
import { MarkdownImport } from "@/features/posts/components/MarkdownImport";
import type { ImportedArticle } from "@/features/posts/markdown";
import { CoverImageField } from "@/features/posts/components/CoverImageField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { POST_STATUSES } from "@/features/posts/schema";
import type { Category, Media, PostDetail, Tag } from "@/types/api";

interface PostEditorProps {
  post?: PostDetail;
  categories: Category[];
  tags: Tag[];
}

function toDefaults(post?: PostDetail): PostFormValues {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    contentFormat: "html",
    categoryId: post?.category?.id ?? null,
    tagIds: post?.tags?.map((t) => t.id) ?? [],
    coverImageId: post?.coverImage?.id ?? null,
    ogImageId: post?.ogImage?.id ?? null,
    status: post?.status ?? "draft",
    publishedAt: post?.publishedAt ?? "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    canonicalUrl: post?.canonicalUrl ?? "",
  };
}

export function PostEditor({ post, categories, tags }: PostEditorProps) {
  const router = useRouter();
  const isEdit = Boolean(post);
  const [isSubmitting, startSubmit] = useTransition();
  const [cover, setCover] = useState<Media | null>(post?.coverImage ?? null);

  const editorRef = useRef<RichTextEditorHandle>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isDirty },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: toDefaults(post),
  });

  const title = watch("title");
  const slug = watch("slug");
  const status = watch("status");
  const content = watch("content");
  const selectedTags = watch("tagIds") ?? [];

  const slugPreview = useMemo(
    () => (slug && slug.length > 0 ? slug : slugify(title || "")) || "untitled",
    [slug, title],
  );

  const wordCount = useMemo(() => {
    const text = (content ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [content]);
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const toggleTag = (id: number) => {
    const current = selectedTags;
    const next = current.includes(id) ? current.filter((t) => t !== id) : [...current, id];
    setValue("tagIds", next, { shouldDirty: true });
  };

  // Import a README/Markdown file into the editor; fill empty title/excerpt.
  const handleImport = (article: ImportedArticle, source: string) => {
    editorRef.current?.setContent(article.html);
    setValue("content", article.html, { shouldDirty: true, shouldValidate: true });

    if (article.title && !getValues("title").trim()) {
      setValue("title", article.title, { shouldDirty: true, shouldValidate: true });
      if (!getValues("slug")) {
        setValue("slug", slugify(article.title), { shouldDirty: true });
      }
    }
    if (article.excerpt && !getValues("excerpt")?.trim()) {
      setValue("excerpt", article.excerpt, { shouldDirty: true });
    }
    toast.success(`Imported ${source} — review and edit below`);
  };

  const onSubmit = handleSubmit((values) => {
    startSubmit(async () => {
      const result = isEdit
        ? await updatePostAction(post!.id, values)
        : await createPostAction(values);
      // createPostAction redirects on success; only failures return here.
      if (result?.fieldErrors?.slug) {
        setError("slug", { message: result.fieldErrors.slug });
        toast.error(result.fieldErrors.slug);
        return;
      }
      if (result && !result.ok) {
        toast.error(result.error ?? "Could not save the post");
        return;
      }
      if (result?.ok) {
        toast.success("Post saved");
        router.refresh();
      }
    });
  });

  // ⌘/Ctrl+S saves without leaving the editor.
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

  // Warn before navigating away with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[1800px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">
            {isEdit ? "Edit post" : "New post"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            /articles/<span className="font-medium text-foreground">{slugPreview}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/posts")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit ? "Save changes" : "Create post"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>

        {/* ---- Content ---- */}
        <TabsContent value="content" className="mt-4">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>{isEdit ? "Replace body from README / Markdown" : "Start from a README"}</Label>
                <MarkdownImport onImport={handleImport} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="An arresting headline"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "title-error" : undefined}
                />
                {errors.title ? (
                  <p id="title-error" role="alert" className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    {...register("slug")}
                    placeholder={slugify(title || "auto-generated")}
                    aria-invalid={!!errors.slug}
                    aria-describedby={errors.slug ? "slug-error" : undefined}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setValue("slug", slugify(title || ""), { shouldDirty: true })}
                  >
                    From title
                  </Button>
                </div>
                {errors.slug ? (
                  <p id="slug-error" role="alert" className="text-sm text-destructive">
                    {errors.slug.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  rows={3}
                  {...register("excerpt")}
                  placeholder="A one or two sentence summary."
                  aria-invalid={!!errors.excerpt}
                  aria-describedby={errors.excerpt ? "excerpt-error" : undefined}
                />
                {errors.excerpt ? (
                  <p id="excerpt-error" role="alert" className="text-sm text-destructive">
                    {errors.excerpt.message}
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
                    <RichTextEditor
                      ref={editorRef}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.content ? (
                  <p id="content-error" role="alert" className="text-sm text-destructive">
                    {errors.content.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <CoverImageField
                value={cover}
                onChange={(media) => {
                  setCover(media);
                  setValue("coverImageId", media?.id ?? null, { shouldDirty: true });
                }}
              />

              <div className="flex flex-col gap-2">
                <Label>Category</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Uncategorized" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Uncategorized</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Tags</Label>
                {tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const active = selectedTags.includes(tag.id);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-ring",
                          )}
                        >
                          {active ? <Check className="size-3" /> : null}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ---- SEO ---- */}
        <TabsContent value="seo" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="seoTitle">SEO title</Label>
                <Input
                  id="seoTitle"
                  {...register("seoTitle")}
                  placeholder="Overrides the title in search results"
                  aria-invalid={!!errors.seoTitle}
                  aria-describedby={errors.seoTitle ? "seoTitle-error" : undefined}
                />
                {errors.seoTitle ? (
                  <p id="seoTitle-error" role="alert" className="text-sm text-destructive">
                    {errors.seoTitle.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="seoDescription">SEO description</Label>
                <Textarea
                  id="seoDescription"
                  rows={3}
                  {...register("seoDescription")}
                  placeholder="Meta description shown in search snippets."
                  aria-invalid={!!errors.seoDescription}
                  aria-describedby={errors.seoDescription ? "seoDescription-error" : undefined}
                />
                {errors.seoDescription ? (
                  <p id="seoDescription-error" role="alert" className="text-sm text-destructive">
                    {errors.seoDescription.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input
                  id="canonicalUrl"
                  {...register("canonicalUrl")}
                  placeholder="https://example.com/original"
                  aria-invalid={!!errors.canonicalUrl}
                  aria-describedby={errors.canonicalUrl ? "canonicalUrl-error" : undefined}
                />
                {errors.canonicalUrl ? (
                  <p id="canonicalUrl-error" role="alert" className="text-sm text-destructive">
                    {errors.canonicalUrl.message}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Publish ---- */}
        <TabsContent value="publish" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6">
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POST_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {status !== "draft" ? (
                <div className="flex flex-col gap-2">
                  <Label>
                    {status === "scheduled" ? "Publish date" : "Published at"}
                  </Label>
                  <Controller
                    control={control}
                    name="publishedAt"
                    render={({ field }) => {
                      const date = field.value ? new Date(field.value) : undefined;
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              aria-invalid={!!errors.publishedAt}
                              aria-describedby={errors.publishedAt ? "publishedAt-error" : undefined}
                              className={cn(
                                "w-full justify-start text-left font-normal sm:w-72",
                                !date && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="size-4" />
                              {date ? format(date, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              onSelect={(d) => field.onChange(d ? d.toISOString() : "")}
                              autoFocus
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                  {errors.publishedAt ? (
                    <p id="publishedAt-error" role="alert" className="text-sm text-destructive">
                      {errors.publishedAt.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
