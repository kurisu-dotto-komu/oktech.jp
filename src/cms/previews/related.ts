import type { CustomPreviewTemplateProps } from "@sveltia/cms";

import { type EntryMap, readText } from "@/cms/previews/entry";

type GetCollection = CustomPreviewTemplateProps["getCollection"];

/** The handful of fields a preview shows from a referenced venue or series. */
export interface RelatedEntry {
  slug: string;
  title?: string;
  label?: string;
  address?: string;
  space?: string;
  cover?: string;
}

const isEntryMap = (value: unknown): value is EntryMap =>
  typeof value === "object" && value !== null && typeof Reflect.get(value, "getIn") === "function";

/**
 * Resolves a relation field to the entry behind it, skipping the round trip when the slug
 * has not changed since the last render — `componentDidUpdate` fires on every keystroke.
 */
export async function loadRelated(
  getCollection: GetCollection,
  collection: string,
  slug: string | undefined,
  current: RelatedEntry | undefined,
): Promise<RelatedEntry | undefined> {
  if (!slug || slug === current?.slug) return undefined;

  const found = await getCollection(collection, slug).catch(() => undefined);
  const entry = Array.isArray(found) ? found[0] : found;
  if (!isEntryMap(entry)) return { slug };

  return {
    slug,
    title: readText(entry, "title"),
    label: readText(entry, "label"),
    address: readText(entry, "address"),
    space: readText(entry, "space"),
    cover: readText(entry, "cover"),
  };
}
