import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

/**
 * Markdown → HTML for the preview pane.
 *
 * `widgetFor("body")` would normally do this, but the body uses our own `markdown_code`
 * widget and `CMS.getFieldType("markdown")` returns nothing — Sveltia's built-in markdown
 * preview is not one of the reusable field types — so there is no preview component to
 * borrow. micromark is already in the tree as part of Astro's own markdown pipeline, and
 * GFM matches what the site renders.
 *
 * Raw HTML in the source is escaped rather than passed through (micromark's default), which
 * is what makes the result safe to hand to `dangerouslySetInnerHTML`.
 */
export function renderMarkdown(source: string): string {
  return micromark(source, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
}
