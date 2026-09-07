import { renderMarkdown } from "@/cms/previews/markdown";

/**
 * The entry body, rendered inside the same `prose` wrapper the site's pages use so
 * headings, lists and tables pick up the Tailwind Typography styles from the real
 * stylesheet.
 */
export default function PreviewBody({ value }: { value?: string }) {
  if (!value) return null;

  return (
    <div
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
    />
  );
}
