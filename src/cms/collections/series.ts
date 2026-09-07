import {
  bodyField,
  coverField,
  devOnlyField,
  pullRequestField,
  stringField,
  titleField,
} from "@/cms/fields/common";
import { R2_PREFIX } from "@/cms/media";
import type { CmsEntryCollection } from "@/cms/types";

/**
 * Recurring event series. Occurrences reference a series instead of carrying their own
 * recurrence data, and every future occurrence is a real event with its own page.
 *
 * No `/series/<slug>` page is built, so there is no `preview_path` and therefore no
 * `aliases_field`: Sveltia only records aliases for collections that have a preview path.
 */
export function buildSeriesCollection(): CmsEntryCollection {
  return {
    name: "series",
    label: "Series",
    label_singular: "Series",
    folder: "/content/series",
    create: true,
    slug: "{{title}}",
    summary: "{{title}}",
    sortable_fields: ["title"],
    thumbnail: "cover",
    // Dev fixtures carry devOnly: true and stay out of the editors' list
    filter: { field: "devOnly", value: false },
    fields: [
      pullRequestField(),
      titleField("Title"),
      stringField("label", "Cadence Label", {
        required: false,
        hint: 'Shown on every occurrence, e.g. "Recurring every other Saturday".',
      }),
      coverField(false, {
        prefix: R2_PREFIX.series,
        hint: "Default cover for occurrences that do not set their own.",
      }),
      devOnlyField(),
      bodyField("Description", false),
    ],
  };
}
