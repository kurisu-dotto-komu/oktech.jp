import { type CollectionEntry, getCollection, getEntry } from "astro:content";

import { SHOW_DEV_ENTRIES } from "@/constants";
import { renderMeta } from "@/content/queries/markdown";
import { resolveEntryImage } from "@/utils/images";
import { readLocation } from "@/utils/maps/location";
import { getVenueMaps } from "@/utils/maps/venueMaps";
import { memoize } from "@/utils/memoize";
import { type ResponsiveImageData, getResponsiveImage } from "@/utils/responsiveImage";

type VenueEntry = CollectionEntry<"venues">;

export type Venue = VenueEntry["data"];
export type ProcessedVenue = Omit<Venue, "cover" | "mapImage" | "mapDarkImage"> & {
  id: string;
  cover?: ResponsiveImageData;
  mapImage?: ResponsiveImageData;
  mapDarkImage?: ResponsiveImageData;
};
export type VenueEnriched = { id: string; data: ProcessedVenue; collection: "venues" };

export const getVenues = memoize(async (): Promise<VenueEntry[]> => {
  const venues = await getCollection("venues");
  const relevant = SHOW_DEV_ENTRIES ? venues : venues.filter((venue) => !venue.data.devOnly);
  // The loader hands entries over in file system order; every listing wants them by id.
  return relevant.filter((venue) => venue.data.hasPage).sort((a, b) => a.id.localeCompare(b.id));
});

async function loadOptionalImage(
  imagePath: string | undefined,
  preset: Parameters<typeof getResponsiveImage>[1],
): Promise<ResponsiveImageData | undefined> {
  if (!imagePath) return undefined;
  return getResponsiveImage(imagePath, preset);
}

export async function processVenue(venue: VenueEntry): Promise<ProcessedVenue> {
  const meta = await renderMeta(venue);
  const maps = getVenueMaps(readLocation(venue.data), venue.id);
  const coverPath = venue.data.cover
    ? (resolveEntryImage(venue.id, `/content/venues/${venue.id}`, venue.data.cover) ?? undefined)
    : undefined;
  const [cover, mapImage, mapDarkImage] = await Promise.all([
    loadOptionalImage(coverPath, "sidebarLayoutHero"),
    loadOptionalImage(maps.mapImage, "venueMap"),
    loadOptionalImage(maps.mapDarkImage, "venueMap"),
  ]);
  return {
    id: venue.id,
    ...venue.data,
    // Map paths used to be part of the entry data, so claim their key positions before
    // `cover` - the resolved images below replace the values but keep the order.
    ...(maps.mapImage && { mapImage: maps.mapImage }),
    ...(maps.mapDarkImage && { mapDarkImage: maps.mapDarkImage }),
    description: meta.description ?? venue.data.description,
    readingTime: meta.readingTime ?? venue.data.readingTime,
    cover,
    mapImage,
    mapDarkImage,
  };
}

export const getVenue = memoize(async (venueSlug: string | undefined): Promise<VenueEnriched> => {
  if (!venueSlug) throw new Error("Venue slug not defined");
  const venue = await getEntry("venues", venueSlug);
  if (!venue) throw new Error(`No venue found for slug ${venueSlug}`);
  return { id: venue.id, data: await processVenue(venue), collection: "venues" };
});
