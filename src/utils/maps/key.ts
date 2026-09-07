import { createHash } from "node:crypto";

import { MAP_ASSET_DIR, MAP_ASSET_PREFIX, MAP_SIZE, MAP_ZOOM, type MapStyle } from "./config";
import type { MapLocation } from "./location";

/** Cache identity of a stitched map: style, position, zoom and canvas size. */
export function mapCacheKey(style: MapStyle, location: MapLocation): string {
  const parts = [style, location.lat, location.lng, MAP_ZOOM, MAP_SIZE].join("|");
  return createHash("sha256").update(parts).digest("hex").slice(0, 12);
}

export function mapAssetName(style: MapStyle, location: MapLocation): string {
  return `${MAP_ASSET_PREFIX}${mapCacheKey(style, location)}.jpg`;
}

/** Repo-root-absolute path, the form the image pipeline expects for local images. */
export function mapAssetPath(style: MapStyle, location: MapLocation): string {
  return `/${MAP_ASSET_DIR}/${mapAssetName(style, location)}`;
}
