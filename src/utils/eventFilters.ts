import type { EventEnriched } from "@/content";

// an event is considered "ended" if it has ended + 30 min buffer
const BUFFER_MINUTES = 30;

// Minimal event data interface that can be satisfied by both EventEnriched and import data
interface EventWithDateTime {
  data: {
    dateTime: Date;
    duration?: number;
  };
}

/** Anything carrying a series, either as a resolved reference or as the plain entry id. */
interface SeriesMember {
  data: { series?: { id: string } | string; devOnly?: boolean };
}

/** An identifiable occurrence: enough to tell the occurrences of one series apart. */
type SeriesOccurrence = EventWithDateTime & SeriesMember & { id: string };

/**
 * Calculates the end time of an event including a buffer period
 */
export function getEventEndTimeWithBuffer(event: EventWithDateTime): Date {
  const startTime = new Date(event.data.dateTime);
  const durationMinutes = event.data.duration || 120; // Default 2 hours if not specified
  const totalMinutes = durationMinutes + BUFFER_MINUTES;

  return new Date(startTime.getTime() + totalMinutes * 60 * 1000);
}

/**
 * Checks if an event should be shown as upcoming
 * Events are considered upcoming if they haven't ended (including 30 min buffer)
 */
export function isEventUpcoming(event: EventWithDateTime, currentTime: Date = new Date()): boolean {
  const endTimeWithBuffer = getEventEndTimeWithBuffer(event);
  return endTimeWithBuffer > currentTime;
}

/**
 * Checks if an event should be shown as recent
 * Events are considered recent if they have ended (including 30 min buffer)
 */
export function isEventRecent(event: EventWithDateTime, currentTime: Date = new Date()): boolean {
  const endTimeWithBuffer = getEventEndTimeWithBuffer(event);
  return endTimeWithBuffer <= currentTime;
}

/**
 * Filters events to get upcoming ones (haven't ended + 30 min buffer)
 */
export function filterUpcomingEvents<T extends EventWithDateTime>(
  events: T[],
  currentTime: Date = new Date(),
): T[] {
  return events.filter((event) => isEventUpcoming(event, currentTime));
}

/**
 * Filters events to get recent ones (have ended + 30 min buffer)
 */
export function filterRecentEvents<T extends EventWithDateTime>(
  events: T[],
  currentTime: Date = new Date(),
): T[] {
  return events.filter((event) => isEventRecent(event, currentTime));
}

/** An event's series id, whether the caller holds a resolved reference or the raw value. */
export function seriesKey(event: SeriesMember): string | undefined {
  const { series } = event.data;
  if (typeof series === "string") return series;
  return series?.id;
}

/**
 * Keeps regular meetups prominent on the landing page above recurring series
 * and dev fixtures.
 */
export function sortUpcomingByTier<T extends EventWithDateTime & SeriesMember>(events: T[]): T[] {
  const tier = (event: T): number => {
    if (event.data.devOnly) return 2;
    if (seriesKey(event)) return 1;
    return 0;
  };
  return [...events].sort((a, b) => {
    const diff = tier(a) - tier(b);
    if (diff !== 0) return diff;
    return new Date(a.data.dateTime).getTime() - new Date(b.data.dateTime).getTime();
  });
}

/**
 * Collapses occurrences so each series appears at most once.
 * Iterates the array in order; for past occurrences, the first hit per series wins —
 * so callers should pass an array sorted most-recent-first to keep the freshest one.
 */
export function dedupeSeriesOccurrences<T extends SeriesMember>(events: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const event of events) {
    const series = seriesKey(event);
    if (series) {
      if (seen.has(series)) continue;
      seen.add(series);
    }
    result.push(event);
  }
  return result;
}

/**
 * Ids of the soonest still upcoming occurrence of each series — the one that carries the
 * cadence label on its card.
 */
export function nextSeriesOccurrenceIds<T extends SeriesOccurrence>(
  events: T[],
  currentTime: Date = new Date(),
): Set<string> {
  const soonest = new Map<string, T>();
  for (const event of events) {
    const key = seriesKey(event);
    if (!key || !isFutureOccurrence(event, currentTime)) continue;
    const current = soonest.get(key);
    if (!current || event.data.dateTime < current.data.dateTime) soonest.set(key, event);
  }
  return new Set([...soonest.values()].map((event) => event.id));
}

function isFutureOccurrence(event: EventWithDateTime, currentTime: Date): boolean {
  return event.data.dateTime.getTime() > currentTime.getTime();
}

/**
 * Drops the upcoming occurrences of a series that are not the soonest one. Listings — the
 * landing page, /events, /events/list, /events/album, rss.xml and the sitemap — announce a
 * series only by its next date; every occurrence keeps its own page, its own .ics and its
 * slot in the combined calendar.
 */
export function filterListedOccurrences<T extends SeriesOccurrence>(
  events: T[],
  currentTime: Date = new Date(),
): T[] {
  const next = nextSeriesOccurrenceIds(events, currentTime);
  return events.filter(
    (event) => !seriesKey(event) || !isFutureOccurrence(event, currentTime) || next.has(event.id),
  );
}

/**
 * Checks if an event is a "legacy" event (OG images are not generated for them)
 */
export function isLegacyEvent(_event: EventWithDateTime | EventEnriched): boolean {
  // TODO: When enabling generated OG images, switch to a specific cutoff date (see below).
  // const eventDate = new Date(event.data.dateTime);
  // const legacyCutoff = new Date("2025-10-10T23:59:59");
  // return eventDate <= legacyCutoff;
  return true;
}
