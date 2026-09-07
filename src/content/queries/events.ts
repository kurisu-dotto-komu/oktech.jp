import { type CollectionEntry, getCollection, getEntry } from "astro:content";

import { FALLBACK_COVER, SHOW_DEV_ENTRIES } from "@/constants";
import { type GalleryImage, getGalleryImages } from "@/content/gallery";
import { type ProcessedVenue, getVenueByRef, processVenue } from "@/content/queries/venues";
import { isEventUpcoming, seriesKey } from "@/utils/eventFilters";
import { resolveEntryImage } from "@/utils/images";
import { memoize } from "@/utils/memoize";
import { type ResponsiveImageData, getResponsiveImage } from "@/utils/responsiveImage";

type EventEntry = CollectionEntry<"events">;
type EventData = EventEntry["data"];

export type EventEnriched = {
  id: string;
  data: Omit<EventData, "cover"> & {
    id: string;
    cover: string;
    isNextRecurringOccurrence?: boolean;
    coverCompact: ResponsiveImageData;
    coverPolaroid: ResponsiveImageData;
    coverBig: ResponsiveImageData;
    coverPage: ResponsiveImageData;
    coverProjector: ResponsiveImageData;
  };
  collection: "events";
  venue?: ProcessedVenue;
  venueSlug?: string;
  galleryImages?: GalleryImage[];
  priority?: boolean;
};

/**
 * Ids of the soonest still upcoming occurrence of each series, which is what `EventCardInfo`
 * renders the cadence badge from. Derived on read so it can never go stale.
 */
const nextSeriesOccurrences = memoize(async (): Promise<Set<string>> => {
  const events = await getCollection("events");
  const now = Date.now();
  const soonest = new Map<string, EventEntry>();
  for (const event of events) {
    const key = seriesKey(event);
    if (!key || event.data.dateTime.getTime() <= now) continue;
    const current = soonest.get(key);
    if (!current || event.data.dateTime < current.data.dateTime) soonest.set(key, event);
  }
  return new Set([...soonest.values()].map((event) => event.id));
});

export const getEvent = memoize(async (eventSlug: string): Promise<EventEnriched> => {
  const entry = await getEntry("events", eventSlug);
  if (!entry) throw new Error(`No event found for slug ${eventSlug}`);

  const venueEntry = entry.data.venue ? await getVenueByRef(entry.data.venue.id) : undefined;
  const cover =
    (entry.data.cover
      ? resolveEntryImage(entry.id, "/content/events", entry.data.cover)
      : undefined) ?? FALLBACK_COVER;
  const isNext = (await nextSeriesOccurrences()).has(entry.id);

  const [venue, galleryImages, coverCompact, coverPolaroid, coverBig, coverPage, coverProjector] =
    await Promise.all([
      venueEntry ? processVenue(venueEntry) : undefined,
      getGalleryImages(entry.id),
      getResponsiveImage(cover, "eventCompact"),
      getResponsiveImage(cover, "eventPolaroid"),
      getResponsiveImage(cover, "eventBig"),
      getResponsiveImage(cover, "sidebarLayoutHero"),
      getResponsiveImage(cover, "galleryLightbox"),
    ]);

  return {
    id: entry.id,
    data: {
      id: entry.id,
      ...entry.data,
      cover,
      ...(isNext ? { isNextRecurringOccurrence: true } : {}),
      coverCompact,
      coverPolaroid,
      coverBig,
      coverPage,
      coverProjector,
    },
    collection: "events",
    venue,
    venueSlug: venueEntry?.id,
    galleryImages,
  };
});

export const getEvents = memoize(async (limitRecent?: number): Promise<EventEnriched[]> => {
  const events = await getCollection("events");
  const relevant = SHOW_DEV_ENTRIES ? events : events.filter((entry) => !entry.data.devOnly);
  const enriched = await Promise.all(relevant.map((entry) => getEvent(entry.id)));
  const prioritized = enriched
    // The loader hands entries over in file system order, so ties need a stable tiebreak.
    .sort(
      (a, b) => b.data.dateTime.getTime() - a.data.dateTime.getTime() || a.id.localeCompare(b.id),
    )
    .map((event, index) => ({ ...event, priority: index < 16 }));
  if (limitRecent === undefined) return prioritized;
  const upcomingIndex = prioritized.findIndex((event) => !isEventUpcoming(event));
  return prioritized.slice(0, upcomingIndex + limitRecent);
});
