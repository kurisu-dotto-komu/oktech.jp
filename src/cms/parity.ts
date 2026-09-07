/**
 * Field-name parity contract between the CMS collections and the zod schemas in
 * `src/content/schemas`. Enforced by `npm run check:cms`.
 */
export type ParityTarget = {
  /** CMS collection name, which is also the content collection name. */
  collection: string;
  /** Module holding the zod schema, named for error messages only - see `scripts/cms-check/schemaKeys.ts`. */
  schemaModule: string;
  /** CMS fields with no frontmatter counterpart. */
  cmsOnly: readonly string[];
  /** Schema keys that are never authored in the CMS: loader-derived, or legacy content shape. */
  derived: readonly string[];
};

/** The markdown body is stored as the file's content, not as frontmatter. */
const BODY = "body";
/** Read-only link widget; never written to frontmatter. */
const PULL_REQUEST = "pullRequest";
/**
 * Written by Sveltia's `aliases_field` when a slug changes, never a CMS field: declaring
 * a field called `aliases` makes Sveltia silently stop recording them.
 */
const ALIASES = "aliases";

const CMS_ONLY = [BODY, PULL_REQUEST] as const;

/**
 * Pre-`channels`/`series` frontmatter still present in `content/`. The site renders them, so
 * they stay in the schemas; delete them from both lists together once the content is migrated.
 */
const LEGACY_EVENT_KEYS = ["meetupId", "links", "recurredFrom", "recurringLabel"] as const;
const LEGACY_VENUE_KEYS = ["coordinates", "meetupId"] as const;

export const PARITY_TARGETS: readonly ParityTarget[] = [
  {
    collection: "events",
    schemaModule: "src/content/schemas/event.ts",
    cmsOnly: CMS_ONLY,
    derived: [ALIASES, ...LEGACY_EVENT_KEYS],
  },
  {
    collection: "series",
    schemaModule: "src/content/schemas/series.ts",
    cmsOnly: CMS_ONLY,
    derived: [],
  },
  {
    collection: "venues",
    schemaModule: "src/content/schemas/venue.ts",
    cmsOnly: CMS_ONLY,
    // Map images come from the committed bitmaps or the stitched tiles; readingTime from remark.
    derived: [ALIASES, "mapImage", "mapDarkImage", "readingTime", ...LEGACY_VENUE_KEYS],
  },
  {
    collection: "articles",
    schemaModule: "src/content/schemas/article.ts",
    cmsOnly: CMS_ONLY,
    derived: [ALIASES],
  },
  {
    collection: "pages",
    schemaModule: "src/content/schemas/page.ts",
    cmsOnly: CMS_ONLY,
    derived: [ALIASES],
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
