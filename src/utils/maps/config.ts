export type MapStyle = "light" | "dark";

export type MapStyleConfig = {
  urlTemplate: string;
  attribution: string;
};

/**
 * Raster tile styles. Watercolour is only available as raster tiles, which is why maps are
 * stitched here rather than requested from Stadia's (vector-only) static map endpoint.
 */
export const MAP_STYLES: Record<MapStyle, MapStyleConfig> = {
  light: {
    urlTemplate: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
    attribution: "© OpenStreetMap contributors, © Stadia Maps, © Stamen Design",
  },
  dark: {
    urlTemplate: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors, © Stadia Maps",
  },
};

export const MAP_ZOOM = 15;
export const MAP_SIZE = 1024;
export const MAP_QUALITY = 90;
export const MAP_TILE_SIZE = 256;
export const MAP_TILE_CONCURRENCY = 8;

/** Durable cache, keyed by style|lat|lng|zoom|size, so rebuilds never refetch tiles. */
export const MAP_CACHE_DIR = "node_modules/.astro/maps";

/**
 * Stitched maps are published flat into `src/assets` because the image pipeline's existing
 * `/src/assets/*.{jpg,…}` glob already covers that directory; a nested cache dir would need a
 * second glob registered in `src/utils/images/local.ts`.
 */
export const MAP_ASSET_DIR = "src/assets";
export const MAP_ASSET_PREFIX = "map-";
