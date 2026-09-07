import { stringField, textField } from "@/cms/fields/common";
import { R2_PREFIX, r2Field } from "@/cms/media";
import type { CmsField } from "@/cms/types";
import { CHANNELS } from "@/content/channels";

const CHANNEL_HINT =
  "Reference on that platform: the numeric Meetup event id, the Luma slug, or a full URL for anything else.";

const CHANNELS_HINT =
  "Where this is published. The order of the rows is the order the buttons appear in on the site.";

/**
 * Where an entry is published. Adding a platform is one row in src/content/channels.ts
 * and no schema change, which is what `type` being a plain string rather than an enum buys.
 * The field is named `channels` in front matter; editors see it as "External Links".
 */
export function channelsField(label: string): CmsField {
  return {
    name: "channels",
    label,
    label_singular: "External Link",
    widget: "list",
    required: false,
    allow_reorder: true,
    hint: CHANNELS_HINT,
    summary: "{{fields.type}} — {{fields.ref}}",
    fields: [
      {
        name: "type",
        label: "Platform",
        widget: "select",
        required: true,
        default: CHANNELS[0]?.id,
        options: CHANNELS.map(({ id, label: optionLabel }) => ({ label: optionLabel, value: id })),
      },
      stringField("ref", "Reference", { required: true, hint: CHANNEL_HINT }),
    ],
  };
}

export function galleryField(): CmsField {
  return {
    name: "gallery",
    label: "Photo Gallery",
    label_singular: "Photo",
    widget: "list",
    required: false,
    collapsed: true,
    allow_reorder: true,
    summary: "{{fields.caption}}",
    fields: [
      {
        name: "src",
        label: "Photo",
        widget: "image",
        required: true,
        choose_url: true,
        ...r2Field(R2_PREFIX.eventGallery),
      },
      stringField("caption", "Caption", { required: false }),
    ],
  };
}

export function attachmentsField(): CmsField {
  return {
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
}
