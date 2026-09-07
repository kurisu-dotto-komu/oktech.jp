/**
 * `tsx scripts/migrate/venues.ts` — step (c) of the content migration.
 *
 * Makes `venue:` a real entry reference and gives venues the same two shapes events got:
 *  - every event's `venue: <meetup id>` becomes `venue: <venue folder id>`;
 *  - each venue's `meetupId` becomes a `channels:` row;
 *  - each venue's `coordinates: {lat, lng}` becomes the GeoJSON `location` string the CMS
 *    map widget reads and writes, with the same two floats.
 *
 * An event pointing at a venue that no lookup resolves is reported and left untouched.
 * Idempotent.
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

import {
  EVENT_KEY_ORDER,
  VENUE_KEY_ORDER,
  eventFiles,
  report,
  rewrite,
  venueFiles,
} from "./frontMatter";

type Coordinates = { lat: number; lng: number };

/** Meetup id -> folder id, plus every folder id mapped to itself so re-runs are no-ops. */
function venueIds(): Map<string, string> {
  const ids = new Map<string, string>();
  for (const file of venueFiles()) {
    const id = path.basename(path.dirname(file));
    const block = fs.readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const data = YAML.parse(block) as { meetupId?: unknown };
    ids.set(id, id);
    if (data.meetupId !== undefined) ids.set(String(data.meetupId), id);
  }
  return ids;
}

const ids = venueIds();
const unresolved: string[] = [];

const events = eventFiles();
const eventsChanged = events.filter((file) =>
  rewrite(file, EVENT_KEY_ORDER, (data) => {
    if (data.venue === undefined) return;
    const ref = String(data.venue).replace(/,/g, "");
    const id = ids.get(ref);
    if (!id) return void unresolved.push(`${path.basename(file)} -> ${ref}`);
    data.venue = id;
  }),
).length;

const venues = venueFiles();
const venuesChanged = venues.filter((file) =>
  rewrite(file, VENUE_KEY_ORDER, (data) => {
    if (data.meetupId !== undefined) {
      data.channels = [{ type: "meetup", ref: String(data.meetupId) }];
      delete data.meetupId;
    }
    const point = data.coordinates as Coordinates | undefined;
    if (point) {
      data.location = JSON.stringify({ type: "Point", coordinates: [point.lng, point.lat] });
      delete data.coordinates;
    }
    delete data.postalCode;
  }),
).length;

report("venues: events", eventsChanged, events.length);
report("venues: venues", venuesChanged, venues.length);
if (unresolved.length) {
  console.error(`[venues] ${unresolved.length} unresolved venue ref(s):`);
  for (const line of unresolved) console.error(`  ${line}`);
  process.exitCode = 1;
}
