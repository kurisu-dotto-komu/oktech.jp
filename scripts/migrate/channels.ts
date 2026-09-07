/**
 * `tsx scripts/migrate/channels.ts` — step (b) of the content migration.
 *
 * Folds `meetupId` plus the free-form `links` map into one ordered `channels:` list of
 * `{ type, ref }` rows. A link key that names a registry platform becomes that platform;
 * anything else keeps its key as the type and still renders, which is the whole point of
 * `type` being a plain string rather than an enum.
 *
 * The row order is the order `EventSocialButtons` used to derive at render time - the
 * RSVP channel first, then the branded platforms, then everything else in file order -
 * so the buttons keep their positions and editors inherit an explicit, reorderable list.
 * Idempotent.
 */
import path from "node:path";

import { CHANNELS } from "../../src/content/channels";
import { EVENT_KEY_ORDER, eventFiles, report, rewrite } from "./frontMatter";

/** Branded platforms, in the order `EventSocialButtons` rendered them before this change. */
const BRANDED = ["linkedIn", "luma", "discord"];
const KNOWN = new Set(CHANNELS.map((channel) => channel.id));

function rowsFor(data: Record<string, unknown>): { type: string; ref: string }[] {
  const rows: { type: string; ref: string }[] = [];
  if (data.meetupId !== undefined) rows.push({ type: "meetup", ref: String(data.meetupId) });

  const links = (data.links ?? {}) as Record<string, unknown>;
  const keys = Object.keys(links);
  const ordered = [...BRANDED.filter((key) => keys.includes(key)), ...keys.filter((key) => !BRANDED.includes(key))]; // prettier-ignore
  for (const key of ordered) {
    const ref = links[key];
    if (typeof ref !== "string" || !ref) continue;
    if (!KNOWN.has(key) && !/^https?:\/\//.test(ref)) {
      throw new Error(`${key}: an unregistered channel must carry a full URL, got "${ref}"`);
    }
    rows.push({ type: key, ref });
  }
  return rows;
}

const files = eventFiles();
const changed = files.filter((file) =>
  rewrite(file, EVENT_KEY_ORDER, (data) => {
    if (data.meetupId === undefined && data.links === undefined) return;
    const rows = rowsFor(data);
    delete data.meetupId;
    delete data.links;
    if (rows.length) data.channels = rows;
  }),
).length;

report(path.basename(import.meta.filename, ".ts"), changed, files.length);
