import type { Metadata } from "next";
import { listCategories, listTags } from "@/lib/admin/api";
import { TaxonomyManager } from "@/features/taxonomy/components/TaxonomyManager";

export const metadata: Metadata = { title: "Taxonomy" };

export default async function TaxonomyPage() {
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  return <TaxonomyManager categories={categories} tags={tags} />;
}
