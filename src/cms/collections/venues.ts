import {
  bodyField,
  booleanField,
  coverField,
  devOnlyField,
  meetupIdField,
  pullRequestField,
  stringField,
  titleField,
} from "@/cms/fields/common";
import type { CmsEntryCollection, CmsField } from "@/cms/types";
import { cmsEntryPath } from "@/utils/cms";

const MAP_IMAGE_HINT =
  "Map images (map.jpg / map-dark.jpg) are generated outside the CMS, so a venue created here will have no map until they are added to the repository.";

function coordinateField(name: string, label: string): CmsField {
  return { name, label, widget: "number", value_type: "float", required: true };
}

const coordinatesField: CmsField = {
  name: "coordinates",
  label: "Coordinates",
  widget: "object",
  required: false,
  collapsed: "auto",
  summary: "{{fields.lat}}, {{fields.lng}}",
  hint: MAP_IMAGE_HINT,
  fields: [coordinateField("lat", "Latitude"), coordinateField("lng", "Longitude")],
};

export function buildVenuesCollection(): CmsEntryCollection {
  return {
    name: "venues",
    label: "Venues",
    label_singular: "Venue",
    description: MAP_IMAGE_HINT,
    folder: "/content/venues",
    path: cmsEntryPath("venues"),
    media_folder: "",
    public_folder: ".",
    preview_path: "venue/{{slug}}",
    create: true,
    slug: "{{fields.meetupId}}-{{fields.title | slugify}}",
    summary: "{{title}} - {{city}}",
    sortable_fields: ["title", "city", "meetupId"],
    fields: [
      pullRequestField(),
      titleField("Venue Name"),
      meetupIdField("Meetup Venue ID"),
      stringField("city", "City", { required: false }),
      stringField("country", "Country", { required: false }),
      stringField("address", "Address", { required: false }),
      stringField("state", "State/Prefecture", { required: false }),
      stringField("space", "Space (Floor / Room)", { required: false }),
      stringField("url", "Website URL", { required: false }),
      stringField("gmaps", "Google Maps URL", { required: false }),
      coordinatesField,
      stringField("description", "Short Description", { required: false }),
      booleanField("hasPage", "Has Dedicated Page", false),
      devOnlyField(),
      coverField(false),
      bodyField("Content", false),
    ],
  };
}
