import type { MarkdownInstance } from "astro";
import { defineCollection, z } from "astro:content";
import path from "path";

type ArticleFrontmatter = {
  title: string;
  description?: string;
  keywords?: string[];
  date?: string | Date;
  /** "Full Name <github-handle>", parsed by `@/utils/author`. */
  author?: string;
  unlisted?: boolean;
};

/**
 * Validation layer for `content/articles/<slug>/index.md`.
 * Routing still happens through the `markdownPages` collection.
 */
export const articlesCollection = defineCollection({
  loader: articlesLoader,
  schema: articlesSchema,
});

/** Unquoted YAML dates reach the loader as ISO 8601 strings, so keep the date part only. */
function toDateString(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

function articlesLoader() {
  return Object.entries(
    import.meta.glob<MarkdownInstance<ArticleFrontmatter>>("/content/articles/**/index.md", {
      eager: true,
    }),
  ).map(([filePath, { frontmatter }]) => ({
    id: path.basename(path.dirname(filePath)),
    filePath: filePath.replace(/^\//, ""),
    title: frontmatter.title,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    date: toDateString(frontmatter.date),
    author: frontmatter.author,
    unlisted: frontmatter.unlisted,
  }));
}

function articlesSchema() {
  return z.object({
    id: z.string(),
    filePath: z.string(),
    title: z.string(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Article date must be formatted as YYYY-MM-DD")
      .optional(),
    author: z.string().optional(),
    unlisted: z.boolean().optional(),
  });
}
