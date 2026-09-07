import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

import { type LocationSource, type MapLocation, readLocation } from "./location";

const VENUES_DIR = "content/venues";
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

async function readFrontMatter(file: string): Promise<LocationSource | undefined> {
  const source = await fs.readFile(file, "utf8").catch(() => undefined);
  const block = source?.match(FRONT_MATTER)?.[1];
  if (!block) return undefined;
  const parsed: unknown = parse(block);
  return parsed && typeof parsed === "object" ? (parsed as LocationSource) : undefined;
}

/**
 * Positions of venues that have no committed `map.jpg`, deduplicated — those are the only ones a
 * build has to stitch. Reads the files directly because this runs before the content layer exists.
 */
export async function venueLocationsNeedingMaps(root: string): Promise<MapLocation[]> {
  const dir = path.join(root, VENUES_DIR);
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const found = new Map<string, MapLocation>();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const venueDir = path.join(dir, entry.name);
    const hasBitmap = await fs
      .access(path.join(venueDir, "map.jpg"))
      .then(() => true)
      .catch(() => false);
    if (hasBitmap) continue;

    const location = readLocation(await readFrontMatter(path.join(venueDir, "venue.md")));
    if (location) found.set(`${location.lat},${location.lng}`, location);
  }
  return [...found.values()];
}
