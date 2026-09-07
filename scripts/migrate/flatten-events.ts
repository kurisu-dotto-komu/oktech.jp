/**
 * `tsx scripts/migrate/flatten-events.ts` — Phase 3 of the content restructure.
 *
 * Turns every `content/events/<id>/event.md` page bundle into a flat
 * `content/events/<id>.md` and moves the bundle's images into the media attic at
 * `content/media/events/<id>/`, bytes untouched. Front matter is then rewritten once:
 * repo-root-absolute `cover`, the remark-derived `description` written down as real
 * data, `group` dropped, and the key order + quoting normalised to what Sveltia
 * writes, so the first CMS save of an old entry produces no reformatting noise.
 *
 * Idempotent: re-running it is a no-op. `descriptions.json` is a dump of
 * `getCollection("events")[].data.description` from the pre-migration build, i.e.
 * exactly what `remarkDescription` derived; it is only consulted for entries that
 * still lack a `description` key.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EVENTS_DIR = path.join(ROOT, "content/events");
const MEDIA_DIR = path.join(ROOT, "content/media/events");
const MEDIA_PUBLIC = "/content/media/events";

/** Front-matter key order — the CMS field order in `src/cms/collections/events.ts`. */
const KEY_ORDER = [
  "title",
  "description",
  "dateTime",
  "duration",
  "cover",
  "venue",
  "space",
  "howToFindUs",
  "meetupId",
  "topics",
  "links",
  "attachments",
  "recurringLabel",
  "recurredFrom",
  "isCancelled",
  "devOnly",
];

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

function move(from: string, to: string): void {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const args = ["mv", path.relative(ROOT, from), path.relative(ROOT, to)];
  try {
    execFileSync("git", args, { cwd: ROOT, stdio: "pipe" });
  } catch {
    fs.renameSync(from, to);
  }
}

/** `<id>/event.md` -> `<id>.md`; everything else in the bundle -> the media attic. */
function flattenBundles(): number {
  let moved = 0;
  for (const entry of fs.readdirSync(EVENTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(EVENTS_DIR, entry.name);
    for (const child of fs.readdirSync(folder)) {
      const target =
        child === "event.md"
          ? path.join(EVENTS_DIR, `${entry.name}.md`)
          : path.join(MEDIA_DIR, entry.name, child);
      move(path.join(folder, child), target);
      moved += 1;
    }
    fs.rmdirSync(folder);
  }
  return moved;
}

/** `./x` and `../<other>/x` become repo-root-absolute media-attic paths. */
function rewriteCover(cover: unknown, id: string): unknown {
  if (typeof cover !== "string") return cover;
  const own = cover.match(/^\.\/(.+)$/);
  if (own) return `${MEDIA_PUBLIC}/${id}/${own[1]}`;
  const sibling = cover.match(/^\.\.\/([^/]+)\/(.+)$/);
  if (sibling) return `${MEDIA_PUBLIC}/${sibling[1]}/${sibling[2]}`;
  return cover;
}

function orderKeys(data: Record<string, unknown>): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const key of [...KEY_ORDER, ...Object.keys(data)]) {
    if (key in data && !(key in ordered)) ordered[key] = data[key];
  }
  return ordered;
}

function rewriteFrontMatter(file: string, descriptions: Record<string, string>): boolean {
  const id = path.basename(file, ".md");
  const absolute = path.join(EVENTS_DIR, file);
  const raw = fs.readFileSync(absolute, "utf8");
  const match = raw.match(FRONT_MATTER);
  if (!match) throw new Error(`${file}: no front matter`);

  const data = YAML.parse(match[1]!) as Record<string, unknown>;
  delete data.group;
  if (data.cover !== undefined) data.cover = rewriteCover(data.cover, id);
  if (!data.description && descriptions[id]) data.description = descriptions[id];

  const ordered = orderKeys(data);
  const yaml = YAML.stringify(ordered, null, YAML_OPTIONS).trim();
  const reparsed = YAML.parse(yaml) as Record<string, unknown>;
  if (JSON.stringify(reparsed) !== JSON.stringify(ordered)) {
    throw new Error(`${file}: YAML normalisation would change values`);
  }

  const next = `---\n${yaml}\n---\n${raw.slice(match[0].length)}`;
  if (next === raw) return false;
  fs.writeFileSync(absolute, next);
  return true;
}

const descriptions = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "descriptions.json"), "utf8"),
) as Record<string, string>;

const moved = flattenBundles();
const files = fs.readdirSync(EVENTS_DIR).filter((file) => file.endsWith(".md"));
const rewritten = files.filter((file) => rewriteFrontMatter(file, descriptions)).length;
console.log(
  `[flatten-events] moved ${moved} path(s), rewrote ${rewritten}/${files.length} entries`,
);
