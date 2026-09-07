import type { MapLocation } from "./location";

export type TilePlan = {
  /** Wrapped tile column/row to request. */
  x: number;
  y: number;
  /** Destination offset of the tile inside the stitched canvas. */
  left: number;
  top: number;
};

/** Web-Mercator projection into absolute pixel space at the given zoom. */
function project(location: MapLocation, zoom: number, tileSize: number) {
  const scale = 2 ** zoom * tileSize;
  const latRad = (location.lat * Math.PI) / 180;
  return {
    x: ((location.lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

/** Tiles covering a width x height canvas centred on `location`, clamped vertically to the map. */
export function planTiles(
  location: MapLocation,
  zoom: number,
  width: number,
  height: number,
  tileSize: number,
): TilePlan[] {
  const center = project(location, zoom, tileSize);
  const originX = center.x - width / 2;
  const originY = center.y - height / 2;
  const tileCount = 2 ** zoom;
  const plans: TilePlan[] = [];

  const firstRow = Math.floor(originY / tileSize);
  const lastRow = Math.floor((originY + height - 1) / tileSize);
  const firstCol = Math.floor(originX / tileSize);
  const lastCol = Math.floor((originX + width - 1) / tileSize);

  for (let row = firstRow; row <= lastRow; row++) {
    if (row < 0 || row >= tileCount) continue;
    for (let col = firstCol; col <= lastCol; col++) {
      plans.push({
        x: ((col % tileCount) + tileCount) % tileCount,
        y: row,
        left: Math.round(col * tileSize - originX),
        top: Math.round(row * tileSize - originY),
      });
    }
  }
  return plans;
}

export function tileUrl(template: string, zoom: number, plan: TilePlan, apiKey?: string): string {
  const url = template
    .replace("{z}", String(zoom))
    .replace("{x}", String(plan.x))
    .replace("{y}", String(plan.y))
    .replace("{r}", "")
    .replace("{s}", "abc"[(plan.x + plan.y) % 3]);
  if (!apiKey) return url;
  return `${url}${url.includes("?") ? "&" : "?"}api_key=${apiKey}`;
}
