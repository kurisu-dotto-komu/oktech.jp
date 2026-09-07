import { mapAssetPath } from "./key";
import type { MapLocation } from "./location";

/** Committed bitmaps win over stitched ones, so existing venue pages stay byte-identical. */
const committedLight = import.meta.glob("/content/venues/**/map.jpg");
const committedDark = import.meta.glob("/content/venues/**/map-dark.jpg");
const stitchedMaps = import.meta.glob("/src/assets/map-*.jpg");

export type VenueMaps = {
  mapImage?: string;
  mapDarkImage?: string;
};

function stitched(style: "light" | "dark", location: MapLocation): string | undefined {
  const assetPath = mapAssetPath(style, location);
  return stitchedMaps[assetPath] ? assetPath : undefined;
}

/**
 * Image-pipeline paths for a venue's light and dark maps. Falls back to the maps stitched by the
 * `venue-maps` integration, and to nothing at all when the venue has no position or no API key was
 * available at build time.
 */
export function getVenueMaps(location: MapLocation | undefined, venueId: string): VenueMaps {
  const light = `/content/venues/${venueId}/map.jpg`;
  const dark = `/content/venues/${venueId}/map-dark.jpg`;
  if (committedLight[light] || committedDark[dark]) {
    return {
      mapImage: committedLight[light] ? light : undefined,
      mapDarkImage: committedDark[dark] ? dark : undefined,
    };
  }
  if (!location) return {};
  return {
    mapImage: stitched("light", location),
    mapDarkImage: stitched("dark", location),
  };
}
