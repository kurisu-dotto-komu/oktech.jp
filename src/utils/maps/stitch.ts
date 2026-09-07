import sharp from "sharp";

import { MAP_QUALITY, MAP_TILE_CONCURRENCY, MAP_TILE_SIZE } from "./config";
import { fetchTiles } from "./fetchTiles";
import type { MapLocation } from "./location";
import { planTiles, tileUrl } from "./tiles";

export type StitchOptions = {
  location: MapLocation;
  zoom: number;
  width: number;
  height: number;
  urlTemplate: string;
  attribution: string;
  apiKey?: string;
};

const FONT_FAMILY = "Helvetica Neue, Helvetica, Arial, sans-serif";
const FONT_SIZE = 13;
const BAR_HEIGHT = 22;
/** Paper-ish tone, so gaps in tile coverage blend with the watercolour style. */
const CANVAS_BACKGROUND = { r: 235, g: 233, b: 227 };

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Renders once and trims, because glyph metrics depend on the fonts installed on the host. */
async function measureText(text: string): Promise<number> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="40"><text x="4" y="26" fill="#000" font-size="${FONT_SIZE}" font-family="${FONT_FAMILY}">${text}</text></svg>`;
  const { info } = await sharp(Buffer.from(svg)).trim().toBuffer({ resolveWithObject: true });
  return info.width;
}

async function attributionOverlay(
  text: string,
  width: number,
  height: number,
): Promise<{ input: Buffer; left: number; top: number }> {
  const escaped = escapeXml(text);
  const boxWidth = (await measureText(escaped)) + 12;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect x="${width - boxWidth}" y="${height - BAR_HEIGHT}" width="${boxWidth}" height="${BAR_HEIGHT}" fill="#fff" fill-opacity="0.8"/>` +
    `<text x="${width - 6}" y="${height - 6}" text-anchor="end" fill="#333" font-size="${FONT_SIZE}" font-family="${FONT_FAMILY}">${escaped}</text>` +
    `</svg>`;
  return { input: Buffer.from(svg), left: 0, top: 0 };
}

/** Downloads the covering tiles and composites them into a single JPEG with a baked-in credit. */
export async function stitchMap(options: StitchOptions): Promise<Buffer> {
  const { location, zoom, width, height, urlTemplate, attribution, apiKey } = options;
  const plans = planTiles(location, zoom, width, height, MAP_TILE_SIZE);
  const tiles = await fetchTiles(
    plans.map((plan) => tileUrl(urlTemplate, zoom, plan, apiKey)),
    MAP_TILE_CONCURRENCY,
  );

  const layers = plans.flatMap((plan, index) => {
    const tile = tiles[index];
    return tile ? [{ input: tile, left: plan.left, top: plan.top }] : [];
  });
  layers.push(await attributionOverlay(attribution, width, height));

  return sharp({ create: { width, height, channels: 3, background: CANVAS_BACKGROUND } })
    .composite(layers)
    .jpeg({ quality: MAP_QUALITY })
    .toBuffer();
}
