import type { CmsConfig, CmsEntryMap, CmsEventRegistry, CmsField } from "@/cms/types";

/** A `collections` entry, which can also be a divider carrying no fields at all. */
type ConfiguredCollection = NonNullable<CmsConfig["collections"]>[number];

/**
 * `saveEntry()` rethrows a backend failure as `new Error('saving_failed', { cause })` and the
 * editor toolbar shows `cause.message` in its error dialog. A `preSave` hook throws through the
 * same catch, so this is how a hook gets a sentence in front of the editor; any other message
 * opens the same dialog with no explanation in it.
 */
const SAVE_FAILED = "saving_failed";

type Data = Record<string, unknown>;

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "") ||
  (Array.isArray(value) && value.length === 0);

/** Sveltia defaults `required` to `true`; an array names the locales the field is required in. */
function isRequired(field: CmsField): boolean {
  const required = "required" in field ? field.required : undefined;
  return Array.isArray(required) ? required.length > 0 : required !== false;
}

/** Sub-fields of an object or a list, in the two shapes a config can declare them. */
function subFields(field: CmsField): CmsField[] {
  if ("fields" in field && Array.isArray(field.fields)) return field.fields;
  if ("field" in field && field.field) return [field.field];
  return [];
}

/** A list of plain values stores each item bare, not under the sub-field's name. */
function itemData(item: unknown, children: CmsField[]): Data {
  if (item && typeof item === "object" && !Array.isArray(item)) return item as Data;
  return children[0] ? { [children[0].name]: item } : {};
}

function emptyRequired(fields: CmsField[], data: Data, prefix: string): string[] {
  return fields.flatMap((field) => {
    const value = data[field.name];
    const label = `${prefix}${field.label ?? field.name}`;

    if (isRequired(field) && isEmpty(value)) return [label];

    const children = subFields(field);
    if (!children.length || isEmpty(value)) return [];

    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        emptyRequired(children, itemData(item, children), `${label} #${index + 1} → `),
      );
    }

    return typeof value === "object" ? emptyRequired(children, value as Data, `${label} → `) : [];
  });
}

function fieldsByCollectionName(config: CmsConfig): Map<string, CmsField[]> {
  const entries = (config.collections ?? []).flatMap((collection: ConfiguredCollection) => {
    const { name } = collection;
    const fields = "fields" in collection && collection.fields ? collection.fields : [];
    return name && fields.length ? [[name, fields] as const] : [];
  });

  return new Map(entries);
}

function message(labels: string[]): string {
  const list = labels.join(", ");
  return labels.length === 1
    ? `${list} is required and still empty. Fill it in, then save.`
    : `These fields are required and still empty: ${list}. Fill them in, then save.`;
}

/**
 * Blocks a save that would write an empty required field.
 *
 * Sveltia validates a draft with `enforceRequired: false` whenever `publish_mode` is
 * `editorial_workflow` and the entry has no pull request yet
 * (`contents/draft/validate/required.js`), matching Decap's decision that an unfinished entry
 * can sit in a pull request. Nothing is marked, no error is shown, and the entry is committed —
 * which is how `content/events/555d18e2df14-abdca6c8d55c.md` came to exist with `title: ''` and
 * `dateTime: ''`. Its name is the giveaway: with both slug template tags resolving to nothing,
 * `fillTemplate()` falls back to a pair of random ids.
 *
 * A pull request full of empty required fields is not a state this site wants, and the file it
 * commits fails the zod schema on the next build, so the leniency is taken back here: `preSave`
 * is the last hook before the commit, and throwing from it aborts the save. Required is read
 * from the same config Sveltia is given, including the sub-fields of every list row, so the two
 * can never disagree.
 */
export function registerRequiredFields(cms: CmsEventRegistry, config: CmsConfig): void {
  const fieldsByCollection = fieldsByCollectionName(config);

  cms.registerEventListener({
    name: "preSave",
    handler: ({ entry }) => {
      const { data, collection } = (entry as unknown as CmsEntryMap).toJS() as {
        data?: Data;
        collection?: string;
      };

      const fields = fieldsByCollection.get(collection ?? "");
      if (!fields) return;

      const labels = emptyRequired(fields, data ?? {}, "");
      if (!labels.length) return;

      throw new Error(SAVE_FAILED, { cause: new Error(message(labels)) });
    },
  });
}
