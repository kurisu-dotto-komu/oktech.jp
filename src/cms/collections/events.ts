import {
  bodyField,
  booleanField,
  coverField,
  devOnlyField,
  numberField,
  pullRequestField,
  stringField,
  stringListField,
  textField,
  titleField,
} from "@/cms/fields/common";
import { attachmentsField, channelsField, galleryField } from "@/cms/fields/lists";
import { R2_PREFIX } from "@/cms/media";
import type { CmsEntryCollection, CmsField } from "@/cms/types";

const dateTimeField: CmsField = {
  name: "dateTime",
  label: "Date & Time (JST)",
  widget: "datetime",
  format: "YYYY-MM-DD HH:mm",
  input_timezone: "Asia/Tokyo",
  output_utc: false,
  required: true,
  hint: "Start time in Japan Standard Time.",
};

const venueField: CmsField = {
  name: "venue",
  label: "Venue",
  widget: "relation",
  collection: "venues",
  value_field: "{{slug}}",
  display_fields: ["title", "city"],
  search_fields: ["title", "city", "address"],
  required: false,
};

const seriesField: CmsField = {
  name: "series",
  label: "Series",
  widget: "relation",
  collection: "series",
  value_field: "{{slug}}",
  display_fields: ["title"],
  search_fields: ["title", "label"],
  required: false,
  hint: "Recurring series this occurrence belongs to. Every future occurrence is listed on its own.",
};

function eventFields(): CmsField[] {
  return [
    pullRequestField(),
    titleField("Title"),
    textField("description", "Short Description", false, {
      hint: "One or two sentences used in listings, feeds and social cards.",
    }),
    dateTimeField,
    numberField("duration", "Duration (minutes)", { required: false, min: 15, default: 120 }),
    coverField(false, {
      prefix: R2_PREFIX.eventCover,
      hint: "16:9 works best; other shapes are centre-cropped to 16:9 on the site. Name the file after the event, e.g. 260919-agentic-assembly-cover.webp — uploads with the same name overwrite each other.",
    }),
    venueField,
    seriesField,
    stringField("space", "Space", {
      required: false,
      hint: "Room or floor within the venue.",
    }),
    textField("howToFindUs", "How to Find Us", false),
    stringListField("topics", "Topics", "Topic", {
      hint: "Free-form tags, e.g. AI/ML, Web Development.",
    }),
    channelsField("Channels"),
    galleryField(),
    attachmentsField(),
    booleanField("isCancelled", "Cancelled", false),
    devOnlyField(),
    bodyField("Body", false),
  ];
}

export function buildEventsCollection(): CmsEntryCollection {
  return {
    name: "events",
    label: "Events",
    label_singular: "Event",
    // No `path`: entries are flat files, which is what makes Duplicate available.
    folder: "/content/events",
    preview_path: "events/{{slug}}",
    create: true,
    slug: "{{fields.dateTime | date('YYMMDD')}}-{{title}}",
    summary: "{{title}} ({{dateTime | date('YYYY-MM-DD')}})",
    sortable_fields: ["dateTime", "title"],
    view_groups: [{ name: "series", label: "Series", field: "series" }],
    thumbnail: "cover",
    // Written by Sveltia when a slug changes; the build turns it into a redirect.
    aliases_field: "aliases",
    fields: eventFields(),
  };
}
