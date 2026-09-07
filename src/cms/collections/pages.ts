import {
  bodyField,
  keywordsField,
  pullRequestField,
  textField,
  titleField,
} from "@/cms/fields/common";
import type { CmsEntryCollection } from "@/cms/types";

/**
 * Standalone markdown pages, served at `/<slug>`. Previously a Sveltia singleton for
 * the code of conduct alone; a folder collection instead, so the page gets the same
 * `aliases_field` rename protection as every other public URL.
 */
export function buildPagesCollection(): CmsEntryCollection {
  return {
    name: "pages",
    label: "Pages",
    label_singular: "Page",
    folder: "/content/pages",
    preview_path: "{{slug}}",
    create: true,
    slug: "{{title}}",
    summary: "{{title}}",
    sortable_fields: ["title"],
    aliases_field: "aliases",
    fields: [
      pullRequestField(),
      titleField("Title"),
      textField("description", "Description", false),
      keywordsField(),
      bodyField("Content", true),
    ],
  };
}
