import {
  bodyField,
  booleanField,
  coverField,
  devOnlyField,
  pullRequestField,
  stringField,
  titleField,
} from "@/cms/fields/common";
import { channelsField } from "@/cms/fields/lists";
import { R2_PREFIX } from "@/cms/media";
import type { CmsEntryCollection, CmsField } from "@/cms/types";
import { cmsEntryPath } from "@/utils/cms";

/** Roughly central Osaka, so the picker opens somewhere useful for a new venue. */
const DEFAULT_CENTER: [number, number] = [135.5023, 34.6937];

/** Stored as a stringified GeoJSON point, which is the only position shape the site reads. */
const locationField: CmsField = {
  name: "location",
  label: "Location",
  widget: "map",
  type: "Point",
  required: false,
  center: DEFAULT_CENTER,
  zoom: 14,
  hint: "Search for the address, then drag the pin. The venue's map images are rendered from this at build time.",
};

export function buildVenuesCollection(): CmsEntryCollection {
  return {
    name: "venues",
    label: "Venues",
    label_singular: "Venue",
    folder: "/content/venues",
    path: cmsEntryPath("venues"),
    media_folder: "",
    public_folder: ".",
    preview_path: "venue/{{slug}}",
    create: true,
    // Sveltia has no `slugify` filter; the global `slug` options do the slugifying.
    slug: "{{title}}",
    summary: "{{title}} - {{city}}",
    sortable_fields: ["title", "city"],
    aliases_field: "aliases",
    fields: [
      pullRequestField(),
      titleField("Venue Name"),
      stringField("city", "City", { required: false }),
      stringField("address", "Address", { required: false }),
      stringField("state", "State/Prefecture", { required: false }),
      stringField("space", "Space (Floor / Room)", { required: false }),
      stringField("url", "Website URL", { required: false }),
      stringField("gmaps", "Google Maps URL", { required: false }),
      locationField,
      channelsField("External Links"),
      stringField("description", "Short Description", { required: false }),
      booleanField("hasPage", "Has Dedicated Page", false),
      devOnlyField(),
      coverField(false, { prefix: R2_PREFIX.venue }),
      bodyField("Content", false),
    ],
  };
}
