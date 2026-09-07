/**
 * Shared front-matter rewriting for the one-shot content migrations in this folder.
 * Every script parses with `yaml`, mutates a plain object and writes it back in the
 * CMS field order with Sveltia's own writer settings, so the files stay byte-stable
 * across steps and the first CMS save produces no reformatting noise.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const EVENTS_DIR = path.join(ROOT, "content/events");
export const VENUES_DIR = path.join(ROOT, "content/venues");

/** Sveltia's YAML writer settings (`output.yaml` defaults, @sveltia/cms 0.207.1). */
const YAML_OPTIONS: YAML.ToStringOptions = {
  indent: 2,
  indentSeq: true,
  lineWidth: 0,
  defaultKeyType: "PLAIN",
  defaultStringType: "PLAIN",
  singleQuote: true,
};

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/**
 * CMS field order, with the pre-migration keys left in the slots they occupy today so a
 * step that does not touch them rewrites nothing. Keys not listed are appended.
 */
export const EVENT_KEY_ORDER = [
  "title",
  "description",
  "dateTime",
  "duration",
  "cover",
  "venue",
  "series",
  "space",
  "howToFindUs",
  "meetupId",
  "topics",
  "links",
  "channels",
  "gallery",
  "attachments",
  "recurringLabel",
  "recurredFrom",
  "isCancelled",
  "devOnly",
  "aliases",
];

export const VENUE_KEY_ORDER = [
  "title",
  "city",
  "address",
  "state",
  "space",
  "url",
  "gmaps",
  "coordinates",
  "location",
  "meetupId",
  "channels",
  "description",
  "hasPage",
  "devOnly",
  "cover",
  "aliases",
];

export type Data = Record<string, unknown>;

function orderKeys(data: Data, keyOrder: readonly string[]): Data {
  const ordered: Data = {};
  for (const key of [...keyOrder, ...Object.keys(data)]) {
    if (key in data && !(key in ordered)) ordered[key] = data[key];
  }
  return ordered;
}

/**
 * Applies `mutate` to one file's front matter. Returns true when the file changed;
 * re-running a migration over already-migrated content is a no-op.
 */
export function rewrite(file: string, keyOrder: readonly string[], mutate: (data: Data) => void) {
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(FRONT_MATTER);
  if (!match) throw new Error(`${file}: no front matter`);

  const data = YAML.parse(match[1]!) as Data;
  mutate(data);

  const ordered = orderKeys(data, keyOrder);
  const yaml = YAML.stringify(ordered, null, YAML_OPTIONS).trim();
  const reparsed = YAML.parse(yaml) as Data;
  if (JSON.stringify(reparsed) !== JSON.stringify(ordered)) {
    throw new Error(`${file}: YAML normalisation would change values`);
  }

  const next = `---\n${yaml}\n---\n${raw.slice(match[0].length)}`;
  if (next === raw) return false;
  fs.writeFileSync(file, next);
  return true;
}

export function eventFiles(): string[] {
  return fs
    .readdirSync(EVENTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(EVENTS_DIR, file));
}

export function venueFiles(): string[] {
  return fs
    .readdirSync(VENUES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(VENUES_DIR, entry.name, "venue.md"))
    .filter((file) => fs.existsSync(file));
}

/** Reports how many of `files` a migration touched, in the shape every script logs. */
export function report(name: string, changed: number, total: number): void {
  console.log(`[${name}] rewrote ${changed}/${total} entries`);
}
