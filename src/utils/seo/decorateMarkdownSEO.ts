import { type CollectionEntry, getCollection } from "astro:content";

import { SITE } from "@/constants";
import { renderMeta } from "@/content/queries/markdown";

import type { SEOMetadata } from ".";

type MarkdownEntry = CollectionEntry<"articles" | "pages">;

async function decorateMarkdownSEO(
  baseSEO: SEOMetadata,
  entry: MarkdownEntry | undefined,
): Promise<SEOMetadata> {
  const baseArticleSEO: SEOMetadata = { ...baseSEO, type: "article" };
  if (!entry) return baseArticleSEO;

  const meta = await renderMeta(entry);
  const title = entry.data.title;

  return {
    ...baseArticleSEO,
    title,
    fullTitle: SITE.title.template.replace("%s", title),
    description:
      entry.data.description ?? meta.description ?? `Learn more about ${title} at OKTech`,
    keywords: entry.data.keywords ?? [title, "OKTech"],
  };
}

/** `getSEO` is called for paths that are not entries (`/404`, `/articles/oldest`), so a miss is normal. */
const findEntry = async (collection: "articles" | "pages", slug: string) =>
  (await getCollection(collection)).find((entry) => entry.id === slug);

export async function decorateArticleSEO(baseSEO: SEOMetadata, slug: string) {
  return decorateMarkdownSEO(baseSEO, await findEntry("articles", slug));
}

export async function decoratePageSEO(baseSEO: SEOMetadata, slug: string) {
  return decorateMarkdownSEO(baseSEO, await findEntry("pages", slug));
}
