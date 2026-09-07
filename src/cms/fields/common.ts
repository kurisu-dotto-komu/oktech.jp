import type { CmsField } from "@/cms/types";
import { PULL_REQUEST_WIDGET } from "@/cms/widgets/pullRequest";

type StringOptions = { required?: boolean; default?: string; hint?: string };
type NumberOptions = { required?: boolean; default?: number; min?: number };
type HintOptions = { hint?: string };

export function stringField(name: string, label: string, options: StringOptions = {}): CmsField {
  return { name, label, widget: "string", ...options };
}

export function textField(
  name: string,
  label: string,
  required: boolean,
  options: HintOptions = {},
): CmsField {
  return { name, label, widget: "text", required, ...options };
}

/** List of plain strings, rendered as one editable row per item. */
export function stringListField(
  name: string,
  label: string,
  itemLabel: string,
  options: HintOptions = {},
): CmsField {
  return {
    name,
    label,
    widget: "list",
    required: false,
    field: { name: "item", label: itemLabel, widget: "string" },
    ...options,
  };
}

export function booleanField(name: string, label: string, defaultValue: boolean): CmsField {
  return { name, label, widget: "boolean", default: defaultValue };
}

export function numberField(name: string, label: string, options: NumberOptions = {}): CmsField {
  return { name, label, widget: "number", value_type: "int", ...options };
}

export function titleField(label: string): CmsField {
  return stringField("title", label, { required: true });
}

export function meetupIdField(label: string): CmsField {
  return numberField("meetupId", label, { required: true });
}

export function coverField(required: boolean, options: HintOptions = {}): CmsField {
  return {
    name: "cover",
    label: "Cover Image",
    widget: "image",
    required,
    choose_url: true,
    ...options,
  };
}

/** Markdown body; raw mode first so the editor opens in plain markdown (toggle in the toolbar). */
export function bodyField(label: string, required: boolean): CmsField {
  return { name: "body", label, widget: "markdown", required, modes: ["raw", "rich_text"] };
}

export function devOnlyField(): CmsField {
  return booleanField("devOnly", "Dev Only (Hidden in Production)", false);
}

export function keywordsField(): CmsField {
  return stringListField("keywords", "Keywords", "Keyword");
}

/** Read-only link to the entry's pull request (custom widget, never written to frontmatter). */
export function pullRequestField(): CmsField {
  return {
    name: "pullRequest",
    label: "Pull request",
    widget: PULL_REQUEST_WIDGET,
    required: false,
  };
}
