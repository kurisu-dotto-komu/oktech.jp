import { getCollection } from "astro:content";

import { renderMeta } from "@/content/queries/markdown";
import { type ParsedAuthor, parseAuthor } from "@/utils/author";
import { memoize } from "@/utils/memoize";
import { articleUrl } from "@/utils/urls/entries";

export type ArticleSummary = {
  id: string;
  title: string;
  description: string;
  href: string;
  author?: ParsedAuthor;
  date?: string;
  readingTime?: string;
  unlisted?: boolean;
};

/** Every article, newest first; the listings and the "next article" link share this order. */
export const getArticles = memoize(async (): Promise<ArticleSummary[]> => {
  // The loader hands entries over in file system order; sort so equal dates stay stable.
  const entries = (await getCollection("articles")).sort((a, b) => a.id.localeCompare(b.id));
  const summaries = await Promise.all(
    entries.map(async (entry) => {
      const meta = await renderMeta(entry);
      return {
        id: entry.id,
        title: entry.data.title,
        description: entry.data.description ?? meta.description ?? "",
        href: articleUrl(entry.id),
        author: entry.data.author ? parseAuthor(entry.data.author) : undefined,
        date: entry.data.date,
        readingTime: meta.readingTime,
        unlisted: entry.data.unlisted,
      };
    }),
  );
  return summaries.sort((a, b) => {
    if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
    return a.title.localeCompare(b.title);
  });
});
