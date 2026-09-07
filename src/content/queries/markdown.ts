import { type CollectionEntry, render } from "astro:content";

/** Front matter after the remark plugins ran, i.e. including the values they derive. */
export type MarkdownMeta = {
  title?: string;
  description?: string;
  readingTime?: string;
};

type RenderableEntry = CollectionEntry<"venues" | "articles" | "pages">;

/**
 * `description` and `readingTime` are derived from the body by `@/utils/remarkPlugins`, which
 * only the rendered entry carries - the loader sees raw front matter.
 */
export async function renderMeta(entry: RenderableEntry): Promise<MarkdownMeta> {
  const { remarkPluginFrontmatter } = await render(entry);
  return remarkPluginFrontmatter as MarkdownMeta;
}
