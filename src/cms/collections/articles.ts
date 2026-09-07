import {
  bodyField,
  booleanField,
  keywordsField,
  pullRequestField,
  stringField,
  textField,
  titleField,
} from "@/cms/fields/common";
import type { CmsEntryCollection, CmsField } from "@/cms/types";
import { cmsEntryPath } from "@/utils/cms";

function authorField(): CmsField {
  return stringField("author", "Author", {
    required: false,
    hint: "Full Name <github-handle>",
  });
}

function dateField(): CmsField {
  return {
    name: "date",
    label: "Date",
    widget: "datetime",
    required: false,
    type: "date",
    format: "YYYY-MM-DD",
  };
}

export function buildArticlesCollection(): CmsEntryCollection {
  return {
    name: "articles",
    label: "Articles",
    label_singular: "Article",
    folder: "/content/articles",
    path: cmsEntryPath("articles"),
    media_folder: "",
    public_folder: ".",
    preview_path: "articles/{{slug}}",
    create: true,
    slug: "{{slug}}",
    summary: "{{title}}",
    // Written by Sveltia when a slug changes; the build turns it into a redirect.
    aliases_field: "aliases",
    fields: [
      pullRequestField(),
      titleField("Title"),
      textField("description", "Description", false),
      keywordsField(),
      authorField(),
      dateField(),
      booleanField("unlisted", "Unlisted (Hidden from the article index)", false),
      bodyField("Content", true),
    ],
  };
}
