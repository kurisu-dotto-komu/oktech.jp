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
  value_field: "meetupId",
  display_fields: ["title", "city"],
  search_fields: ["title", "city", "address"],
  required: false,
};

const topicsField: CmsField = stringListField("topics", "Topics", "Topic", {
  hint: "Free-form tags, e.g. AI/ML, Web Development.",
});

const linksField: CmsField = {
  name: "links",
  label: "Links",
  widget: "keyvalue",
  key_label: "Name",
  value_label: "URL",
  required: false,
  hint: "Named links such as website or luma. Meetup links come from the Meetup ID.",
};

const attachmentsField: CmsField = {
  name: "attachments",
  label: "Attachments",
  label_singular: "Attachment",
  widget: "list",
  required: false,
  collapsed: true,
  summary: "{{fields.title}}",
  fields: [
    stringField("icon", "Icon", {
      required: true,
      hint: "One of: slides, presentation, github, code, video, youtube, docs, documentation, blog, article, tutorial, course. Anything else shows a generic link icon.",
    }),
    stringField("title", "Title", { required: true }),
    textField("description", "Description", false),
    stringField("url", "URL", { required: true }),
  ],
};

const recurredFromField: CmsField = {
  name: "recurredFrom",
  label: "Recurred From",
  widget: "string",
  required: false,
  readonly: true,
  hint: "Slug of the recurring parent this occurrence was split out from. Managed in Git.",
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
      hint: "16:9 works best; other shapes are centre-cropped to 16:9 on the site. Upload a file or paste an image URL; falls back to the default cover when empty.",
    }),
    venueField,
    stringField("space", "Space", {
      required: false,
      hint: "Room or floor within the venue.",
    }),
    textField("howToFindUs", "How to Find Us", false),
    stringField("meetupId", "Meetup ID", {
      required: false,
      hint: "Numeric or alphanumeric id from the Meetup event URL. Leave empty for events not on Meetup.",
    }),
    topicsField,
    linksField,
    attachmentsField,
    stringField("recurringLabel", "Recurring Label", {
      required: false,
      hint: 'Shown on recurring occurrences, e.g. "Recurring every other Saturday".',
    }),
    recurredFromField,
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
    folder: "/content/events",
    media_folder: "/content/media/events",
    public_folder: "/content/media/events",
    preview_path: "events/{{slug}}",
    create: true,
    // Recurring parents carry a `repeat` map that Sveltia cannot round-trip, so they must stay
    // out of the CMS. Sveltia flattens frontmatter before filtering, so `repeat` is only visible
    // as `repeat.<yymmdd>.<key>` and cannot be matched directly; parents are instead the only
    // events whose slug does not start with a digit.
    filter: { field: "slug", pattern: "^\\d" },
    slug: "{{fields.dateTime | date('YYMMDD')}}-{{title}}",
    summary: "{{title}} ({{dateTime | date('YYYY-MM-DD')}})",
    sortable_fields: ["dateTime", "title", "meetupId"],
    fields: eventFields(),
  };
}
