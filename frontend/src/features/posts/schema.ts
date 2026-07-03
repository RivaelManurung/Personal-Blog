import { z } from "zod";

export const POST_STATUSES = ["draft", "scheduled", "published"] as const;

/** Mirrors PostInput (src/types/api.ts). Coerces empty optionals to undefined. */
export const postSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200, "Keep the title under 200 characters"),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
      .max(96)
      .optional()
      .or(z.literal("")),
    excerpt: z.string().trim().max(320, "Keep the excerpt concise").optional().or(z.literal("")),
    content: z.string().min(1, "Content is required"),
    contentFormat: z.enum(["html", "markdown"]).default("html"),
    categoryId: z.number().int().positive().nullable().optional(),
    tagIds: z.array(z.number().int().positive()).default([]),
    coverImageId: z.number().int().positive().nullable().optional(),
    ogImageId: z.number().int().positive().nullable().optional(),
    status: z.enum(POST_STATUSES).default("draft"),
    publishedAt: z.string().datetime({ offset: true }).nullable().optional().or(z.literal("")),
    seoTitle: z.string().trim().max(200).optional().or(z.literal("")),
    seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
    canonicalUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.status === "scheduled" && !val.publishedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled posts need a publish date",
        path: ["publishedAt"],
      });
    }
  });

export type PostFormValues = z.input<typeof postSchema>;
export type PostParsedValues = z.output<typeof postSchema>;
