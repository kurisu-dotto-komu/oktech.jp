import fs from "node:fs/promises";
import path from "node:path";

import {
  MAP_ASSET_DIR,
  MAP_ASSET_PREFIX,
  MAP_CACHE_DIR,
  MAP_SIZE,
  MAP_STYLES,
  MAP_ZOOM,
  type MapStyle,
} from "./config";
import { mapAssetName, mapCacheKey } from "./key";
import type { MapLocation } from "./location";
import { stitchMap } from "./stitch";

const exists = (filePath: string) =>
  fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);

/**
 * Produces `src/assets/map-<hash>.jpg` for one style, reusing the durable cache under
 * `node_modules/.astro/maps` so a rebuild never refetches tiles. Returns the asset file name.
 */
export async function ensureStitchedMap(
  root: string,
  style: MapStyle,
  location: MapLocation,
  apiKey: string,
): Promise<string> {
  const assetName = mapAssetName(style, location);
  const assetFile = path.join(root, MAP_ASSET_DIR, assetName);
  if (await exists(assetFile)) return assetName;

  const cacheFile = path.join(root, MAP_CACHE_DIR, `${mapCacheKey(style, location)}.jpg`);
  if (!(await exists(cacheFile))) {
    const { urlTemplate, attribution } = MAP_STYLES[style];
    const image = await stitchMap({
      location,
      zoom: MAP_ZOOM,
      width: MAP_SIZE,
      height: MAP_SIZE,
      urlTemplate,
      attribution,
      apiKey,
    });
    await fs.mkdir(path.dirname(cacheFile), { recursive: true });
    await fs.writeFile(cacheFile, image);
  }

  await fs.mkdir(path.dirname(assetFile), { recursive: true });
  await fs.copyFile(cacheFile, assetFile);
  return assetName;
}

/** Drops published maps that no venue asks for any more, so `src/assets` never accumulates. */
export async function pruneStitchedMaps(root: string, keep: Set<string>): Promise<void> {
  const dir = path.join(root, MAP_ASSET_DIR);
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  const stale = entries.filter(
    (name) => name.startsWith(MAP_ASSET_PREFIX) && name.endsWith(".jpg") && !keep.has(name),
  );
  await Promise.all(stale.map((name) => fs.rm(path.join(dir, name), { force: true })));
}
