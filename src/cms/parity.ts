/**
 * Field-name parity contract between the CMS collections and the zod schemas in
 * `src/content`. Enforced by `npm run check:cms`.
 */
export type ParityTarget = {
  /** CMS collection name, which is also the content collection name. */
  collection: string;
  /** Module holding the zod schema, relative to the repository root. */
  schemaModule: string;
  /** Function in that module returning the `z.object({ ... })` shape. */
  schemaFunction: string;
  /** CMS fields with no frontmatter counterpart. */
  cmsOnly: readonly string[];
  /** Schema keys the loader derives, so they are never authored in the CMS. */
  derived: readonly string[];
};

/** The markdown body is stored as the file's content, not as frontmatter. */
const BODY = "body";
/** Read-only link widget; never written to frontmatter. */
const PULL_REQUEST = "pullRequest";

export const PARITY_TARGETS: readonly ParityTarget[] = [
  {
    collection: "events",
    schemaModule: "src/content/events.ts",
    schemaFunction: "eventsSchema",
    cmsOnly: [BODY, PULL_REQUEST],
    derived: [
      "id",
      "readingTime",
      "bodySlug",
      "isNextRecurringOccurrence",
      "calendarOnly",
      // `repeat` is expanded into standalone entries by the loader and is
      // deliberately not editable in the CMS (see the events collection filter).
    ],
  },
  {
    collection: "venues",
    schemaModule: "src/content/venues.ts",
    schemaFunction: "venuesSchema",
    cmsOnly: [BODY, PULL_REQUEST],
    derived: [
      "id",
      "readingTime",
      "mapImage",
      "mapDarkImage",
      // Imported from Meetup, never edited by hand.
      "postalCode",
    ],
  },
  {
    collection: "articles",
    schemaModule: "src/content/articles.ts",
    schemaFunction: "articlesSchema",
    cmsOnly: [BODY, PULL_REQUEST],
    derived: ["id", "filePath"],
  },
];

/** Compares one collection's CMS field names against its zod shape keys. */
export function checkParity(
  target: ParityTarget,
  cmsFields: readonly string[],
  schemaKeys: readonly string[],
): string[] {
  const errors: string[] = [];

  for (const field of cmsFields) {
    if (schemaKeys.includes(field) || target.cmsOnly.includes(field)) continue;
    errors.push(
      `${target.collection}: CMS field "${field}" is missing from ${target.schemaModule}`,
    );
  }

  for (const key of schemaKeys) {
    if (cmsFields.includes(key) || target.derived.includes(key)) continue;
    errors.push(
      `${target.collection}: schema key "${key}" has no CMS field (add it, or list it in PARITY_TARGETS.derived)`,
    );
  }

  for (const name of [...target.cmsOnly, ...target.derived]) {
    const stale = target.cmsOnly.includes(name)
      ? !cmsFields.includes(name)
      : !schemaKeys.includes(name);
    if (stale) errors.push(`${target.collection}: stale allowlist entry "${name}"`);
  }

  return errors;
}
