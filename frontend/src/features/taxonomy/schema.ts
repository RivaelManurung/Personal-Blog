import { z } from "zod";

const slugField = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
  .max(96)
  .optional()
  .or(z.literal(""));

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: slugField,
  description: z.string().trim().max(280).optional().or(z.literal("")),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: slugField,
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export type TagFormValues = z.infer<typeof tagSchema>;
