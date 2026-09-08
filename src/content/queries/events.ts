import { type CollectionEntry, getCollection, getEntry } from "astro:content";

import { FALLBACK_COVER, SHOW_DEV_ENTRIES } from "@/constants";
import { type GalleryImage, resolveGallery } from "@/content/queries/gallery";
import { type ProcessedVenue, processVenue } from "@/content/queries/venues";
import {
  filterListedOccurrences,
  isEventUpcoming,
  nextSeriesOccurrenceIds,
} from "@/utils/eventFilters";
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
    /** Name of the event's series, shown as an eyebrow above the title, e.g. "Agentic Assembly". */
    seriesTitle?: string;
    /** The authored title without the series prefix. */
    sessionTitle?: string;
    /** Cadence text of the event's series, e.g. "Recurring every other Saturday". */
    seriesLabel?: string;
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
const nextSeriesOccurrences = memoize(
  async (): Promise<Set<string>> => nextSeriesOccurrenceIds(await getCollection("events")),
);

export const getEvent = memoize(async (eventSlug: string): Promise<EventEnriched> => {
  const entry = await getEntry("events", eventSlug);
  if (!entry) throw new Error(`No event found for slug ${eventSlug}`);

  const venueEntry = entry.data.venue ? await getEntry("venues", entry.data.venue.id) : undefined;
  const series = entry.data.series ? await getEntry("series", entry.data.series.id) : undefined;
  const coverRef = entry.data.cover ?? series?.data.cover;
  const cover =
    (coverRef ? resolveEntryImage(entry.id, "/content/events", coverRef) : undefined) ??
    FALLBACK_COVER;
  const isNext = (await nextSeriesOccurrences()).has(entry.id);

  const [venue, galleryImages, coverCompact, coverPolaroid, coverBig, coverPage, coverProjector] =
    await Promise.all([
      venueEntry ? processVenue(venueEntry) : undefined,
      resolveGallery(entry.data.gallery),
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
      // Occurrences are authored with just their own title; single-string contexts get
      // "Series - Title", visual ones render the series as an eyebrow (EventTitle)
      title: series ? `${series.data.title} - ${entry.data.title}` : entry.data.title,
      ...(series ? { sessionTitle: entry.data.title } : {}),
      cover,
      ...(series ? { seriesTitle: series.data.title } : {}),
      ...(series?.data.label ? { seriesLabel: series.data.label } : {}),
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

const sortedEvents = memoize(async (): Promise<EventEnriched[]> => {
  const events = await getCollection("events");
  const relevant = SHOW_DEV_ENTRIES ? events : events.filter((entry) => !entry.data.devOnly);
  const enriched = await Promise.all(relevant.map((entry) => getEvent(entry.id)));
  // The loader hands entries over in file system order, so ties need a stable tiebreak.
  return enriched.sort(
    (a, b) => b.data.dateTime.getTime() - a.data.dateTime.getTime() || a.id.localeCompare(b.id),
  );
});

/** Eager-loads the images of whatever comes first on the page it is rendered on. */
const withPriority = (events: EventEnriched[]): EventEnriched[] =>
  events.map((event, index) => ({ ...event, priority: index < 16 }));

/**
 * Every event, later occurrences of a series included. For the surfaces that address an
 * occurrence directly: its page, its OG route, its .ics and the combined calendar.
 */
export const getAllEvents = memoize(
  async (): Promise<EventEnriched[]> => withPriority(await sortedEvents()),
);

/**
 * The listing-facing set: a series is announced by its next date only, so the occurrences
 * after it are left out. Used by every browsable surface and by the feeds that mirror them.
 */
export const getEvents = memoize(async (limitRecent?: number): Promise<EventEnriched[]> => {
  const prioritized = withPriority(filterListedOccurrences(await sortedEvents()));
  if (limitRecent === undefined) return prioritized;
  const upcomingIndex = prioritized.findIndex((event) => !isEventUpcoming(event));
  return prioritized.slice(0, upcomingIndex + limitRecent);
});
