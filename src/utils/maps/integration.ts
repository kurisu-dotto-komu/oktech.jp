import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import { fileURLToPath } from "node:url";

import { ensureStitchedMap, pruneStitchedMaps } from "./cache";
import { MAP_STYLES, type MapStyle } from "./config";
import { mapAssetName } from "./key";
import { venueLocationsNeedingMaps } from "./venueScan";

const STYLES = Object.keys(MAP_STYLES) as MapStyle[];

async function generateVenueMaps(root: string, logger: AstroIntegrationLogger): Promise<void> {
  const locations = await venueLocationsNeedingMaps(root);
  const expected = new Set(
    locations.flatMap((location) => STYLES.map((style) => mapAssetName(style, location))),
  );
  await pruneStitchedMaps(root, expected);
  if (!locations.length) return;

  const apiKey = process.env.STADIA_MAPS_API_KEY;
  if (!apiKey) {
    logger.warn(
      `STADIA_MAPS_API_KEY is not set: ${locations.length} venue(s) without a committed map.jpg will render without a map.`,
    );
    return;
  }

  let stitched = 0;
  for (const location of locations) {
    for (const style of STYLES) {
      try {
        await ensureStitchedMap(root, style, location, apiKey);
        stitched++;
      } catch (error) {
        logger.warn(
          `Failed to stitch the ${style} map for ${location.lat},${location.lng}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
  logger.info(`Venue maps ready (${stitched}/${expected.size} stitched or cached).`);
}

/**
 * Stitches maps for venues that have no committed bitmap, before Vite resolves the image globs.
 * Failures are never fatal — a venue simply renders without a map, as it does today.
 */
export default function venueMaps(): AstroIntegration {
  return {
    name: "venue-maps",
    hooks: {
      "astro:config:setup": async ({ config, logger }) => {
        await generateVenueMaps(fileURLToPath(config.root), logger);
      },
    },
  };
}
