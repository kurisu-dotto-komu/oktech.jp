import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

import { bucketImageUrl } from "@/cms/previews/assets";
import { UPLOADS_PREFIX } from "@/uploads";

/** Media-bucket references in the body, which the build rewrites the same way. */
const BUCKET_REF = new RegExp(`${UPLOADS_PREFIX}[^\\s)"'<>]+`, "g");

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
  const resolved = source.replace(BUCKET_REF, (ref) => bucketImageUrl(ref) ?? ref);

  return micromark(resolved, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
}
